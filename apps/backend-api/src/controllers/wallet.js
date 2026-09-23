const { v4: uuidv4 } = require('uuid');
const {
  Wallet, WalletTransaction, Notification, AuditLog, BudgetHold, sequelize,
} = require('../models');
const paypal = require('../services/paypal');
const { checkBudgetRestrictions, recordAllocationSpend, findAllocationForSpend } = require('../services/budgetEnforcement');

/**
 * Get or create the user's wallet.
 */
async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ where: { user_id: userId } });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: userId, balance: 0 });
  }
  return wallet;
}

// GET /api/v1/wallet
const getWallet = async (req, res, next) => {
  try {
    const wallet = await getOrCreateWallet(req.userId);

    // Open card holds backing the wallet balance (hold-then-capture model)
    const holds = await BudgetHold.findAll({
      where: { status: 'open' },
      include: [{
        model: sequelize.models.Budget,
        as: 'budget',
        where: { user_id: req.userId },
        required: true,
      }],
      order: [['created_at', 'DESC']],
    });

    const totalHeld = holds.reduce((sum, h) => sum + (parseFloat(h.amount) - parseFloat(h.amount_captured)), 0);

    res.json({
      success: true,
      data: {
        ...wallet.toJSON(),
        payment_mode: paypal.getPaymentMode(),
        funds_held_on_card: totalHeld.toFixed(2),
        open_holds: holds.map((h) => ({
          id: h.id,
          budget_id: h.budget_id,
          budget_name: h.budget?.name || null,
          amount: h.amount,
          amount_captured: h.amount_captured,
          remaining: (parseFloat(h.amount) - parseFloat(h.amount_captured)).toFixed(2),
          status: h.status,
          mode: h.mode,
          expires_at: h.expires_at,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/wallet/transactions
const listWalletTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const wallet = await getOrCreateWallet(req.userId);

    const where = { wallet_id: wallet.id };
    if (type) where.type = type;

    const { count, rows } = await WalletTransaction.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 100),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/wallet/pay
//
// Budget-item payment. Two-step money movement:
//   1. Budget enforcement — the category must have an allocation with enough
//      remaining funds (money is ring-fenced per expense).
//   2. Card capture — the amount is captured from the budget's PayPal card
//      hold. This is the REAL card charge: it appears on the student's card
//      statement and the PayPal dashboard, described with the budget name.
// The wallet balance is debited only after the capture succeeds.
const payFromWallet = async (req, res, next) => {
  try {
    const { amount, description } = req.validated.body;
    const wallet = await getOrCreateWallet(req.userId);
    const amt = parseFloat(amount);

    if (wallet.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'WALLET_INACTIVE', message: 'Wallet is not active' },
      });
    }

    // ── Budget-restricted spending (must target a budget allocation) ──
    const restrictionCategoryId = req.validated.body.category_id || null;
    const restriction = await checkBudgetRestrictions(req.userId, {
      amount: amt,
      categoryId: restrictionCategoryId,
    });
    if (!restriction.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUDGET_RESTRICTION',
          message: restriction.violations[0].message,
          details: restriction.violations,
        },
      });
    }

    // ── Capture from the budget's card hold (real charge via PayPal) ──
    // Pick the hold belonging to the same budget as the allocation that
    // will be debited, so captures and allocations never drift apart.
    const target = await findAllocationForSpend(req.userId, restrictionCategoryId, amt);
    if (!target) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_OPEN_HOLD',
          message: 'No funded allocation with enough remaining balance for this expense. Fund the budget first.',
        },
      });
    }

    const hold = await BudgetHold.findOne({
      where: { budget_id: target.budget.id, status: 'open' },
      order: [['created_at', 'DESC']],
    });

    if (!hold) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_OPEN_HOLD',
          message: 'No open card hold for this budget. Fund the budget first.',
        },
      });
    }

    const capture = await paypal.captureFromHold({
      holdId: hold.provider_hold_id,
      amount: amt,
      reference: `SPEND-${uuidv4()}`,
      description: description || 'Budget expense',
      isFinal: false,
    });

    if (capture.status !== 'completed') {
      return res.status(402).json({
        success: false,
        error: {
          code: 'CAPTURE_FAILED',
          message: capture.failureReason || 'The card could not be charged for this expense.',
        },
      });
    }

    // ── Debit wallet + record the spend atomically ──
    const now = new Date();
    const result = await sequelize.transaction(async (t) => {
      const freshWallet = await Wallet.findByPk(wallet.id, { transaction: t, lock: t.LOCK.UPDATE });

      // Rolling daily/monthly spend trackers (informational now — the hard
      // limit is the budget allocation itself)
      const lastDaily = freshWallet.daily_spent_at ? new Date(freshWallet.daily_spent_at) : null;
      if (!lastDaily || lastDaily.toDateString() !== now.toDateString()) {
        freshWallet.daily_spent = amt;
      } else {
        freshWallet.daily_spent = parseFloat(freshWallet.daily_spent) + amt;
      }
      freshWallet.daily_spent_at = now;

      const lastMonthly = freshWallet.monthly_spent_at ? new Date(freshWallet.monthly_spent_at) : null;
      if (!lastMonthly || lastMonthly.getMonth() !== now.getMonth() || lastMonthly.getFullYear() !== now.getFullYear()) {
        freshWallet.monthly_spent = amt;
      } else {
        freshWallet.monthly_spent = parseFloat(freshWallet.monthly_spent) + amt;
      }
      freshWallet.monthly_spent_at = now;

      // Guard: wallet balance must cover the spend (wallet mirrors captured funds)
      if (parseFloat(freshWallet.balance) < amt) {
        throw Object.assign(new Error('Insufficient balance'), { statusCode: 400, code: 'INSUFFICIENT_FUNDS' });
      }

      freshWallet.balance = parseFloat(freshWallet.balance) - amt;
      await freshWallet.save({ transaction: t });

      // Update the hold's captured amount; finalize when fully captured
      const holdRow = await BudgetHold.findByPk(hold.id, { transaction: t, lock: t.LOCK.UPDATE });
      holdRow.amount_captured = parseFloat(holdRow.amount_captured) + amt;
      const fullyCaptured =
        parseFloat(holdRow.amount_captured) >= parseFloat(holdRow.amount) - 0.005;
      holdRow.status = fullyCaptured ? 'captured' : 'open';
      holdRow.captured_at = fullyCaptured ? now : holdRow.captured_at;
      await holdRow.save({ transaction: t });

      const walletTx = await WalletTransaction.create({
        wallet_id: freshWallet.id,
        type: 'payment',
        amount: amt,
        balance_after: freshWallet.balance,
        status: 'completed',
        provider: 'paypal',
        provider_reference: capture.providerReference,
        hold_id: hold.id,
        description: description || 'Budget expense',
        meta: {
          category_id: restrictionCategoryId,
          budget_id: hold.budget_id,
          capture_mode: capture.mode,
        },
      }, { transaction: t });

      // ── Record spending against the budget allocation ──
      const allocation = await recordAllocationSpend(req.userId, {
        categoryId: restrictionCategoryId,
        amount: amt,
        transaction: t,
      });

      return { freshWallet, walletTx, allocation };
    });

    await AuditLog.create({
      actor_id: req.userId,
      actor_type: 'user',
      action: 'wallet.payment',
      resource_type: 'wallet_transaction',
      resource_id: result.walletTx.id,
      details: {
        amount: amt,
        balance_after: result.freshWallet.balance,
        hold_id: hold.id,
        provider_reference: capture.providerReference,
      },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        transaction: result.walletTx,
        balance: result.freshWallet.balance,
        allocation: result.allocation,
        hold_remaining: (parseFloat(hold.amount) - parseFloat(hold.amount_captured) - amt).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/wallet/limits
const updateLimits = async (req, res, next) => {
  try {
    const { daily_limit, monthly_limit } = req.validated.body;
    const wallet = await getOrCreateWallet(req.userId);

    if (daily_limit !== undefined) wallet.daily_limit = daily_limit;
    if (monthly_limit !== undefined) wallet.monthly_limit = monthly_limit;
    await wallet.save();

    res.json({ success: true, data: wallet });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWallet,
  listWalletTransactions,
  payFromWallet,
  updateLimits,
  getOrCreateWallet,
};
