/**
 * Budget funding engine
 *
 * Implements the "automatic funding" part of the flow: on a budget's funding
 * date, the student's linked PayPal is charged, the wallet is credited, and
 * money is allocated to the budget's expense categories. Allocations are
 * enforced when spending (see services/budgetEnforcement.js).
 *
 * On failure the student is notified and can retry — the budget is NOT marked
 * funded until a charge completes.
 */

const { Op } = require('sequelize');
const {
  Budget, BudgetAllocation, FundingAttempt, BudgetHold, Wallet, WalletTransaction,
  Notification, PaymentMethod, sequelize,
} = require('../models');
const paypal = require('./paypal');
const { computeNextFundingDate } = require('../utils/dates');

/** Guard against double-charging the same budget cycle. */
async function hasCompletedAttempt(budgetId, scheduledDate) {
  const existing = await FundingAttempt.findOne({
    where: { budget_id: budgetId, scheduled_date: scheduledDate, status: 'completed' },
  });
  return Boolean(existing);
}

/** Lazy load budgetAlerts to avoid circular imports. */
function getBudgetAlertsService() {
  return require('./budgetAlerts');
}

/** Create a notification for funding events (deduped). */
async function notifyUser(userId, type, title, body, actionUrl) {
  const { createNotification } = getBudgetAlertsService();
  return createNotification({ userId, type, title, body, actionUrl });
}

/**
 * Charge the budget amount and fund the budget.
 *
 * Steps:
 *   1. Idempotency — skip if this cycle already completed.
 *   2. Resolve the student's linked PayPal (default, or budget-specific).
 *   3. Record a pending FundingAttempt.
 *   4. Charge via PayPal (live) or simulation.
 *   5. On failure — record reason, bump failure counter, notify student.
 *   6. On success — credit wallet, record wallet tx, mark allocations funded,
 *      mark budget funded, advance next funding date, notify student.
 *
 * @returns {Promise<{status: 'completed'|'failed', attempt, alreadyFunded?}>}
 */
async function fundBudget(budget, scheduledDate, { isRetry = false } = {}) {
  const dateStr = new Date(scheduledDate).toISOString().slice(0, 10);
  const amount = parseFloat(budget.amount);

  // 1. Idempotency — never double-charge a cycle
  if (await hasCompletedAttempt(budget.id, dateStr)) {
    const attempt = await FundingAttempt.findOne({
      where: { budget_id: budget.id, scheduled_date: dateStr, status: 'completed' },
    });
    return { status: 'completed', attempt, alreadyFunded: true };
  }

  // 2. Resolve payment method (budget-specific first, then user default)
  const paymentMethod = budget.payment_method_id
    ? await PaymentMethod.findOne({ where: { id: budget.payment_method_id, status: 'active' } })
    : await PaymentMethod.findOne({ where: { user_id: budget.user_id, status: 'active' }, order: [['is_default', 'DESC']] });

  // 3. Record the attempt
  const attempt = await FundingAttempt.create({
    budget_id: budget.id,
    payment_method_id: paymentMethod?.id || null,
    amount,
    scheduled_date: dateStr,
    status: 'pending',
  });

  // No payment method connected → failure the student must fix
  if (!paymentMethod) {
    await attempt.update({
      status: 'failed',
      failure_reason: 'NO_PAYMENT_METHOD',
      metadata: { is_retry: isRetry },
    });
    await notifyUser(
      budget.user_id,
      'funding_failed',
      'Budget funding failed',
      `Your "${budget.name || 'monthly'}" budget could not be funded (K${amount.toFixed(2)}). Reason: No payment method connected. Link your card and retry.`,
      '/budgets'
    );
    return { status: 'failed', attempt };
  }

  // 4. Place a HOLD (card authorization) on the student's card for this
  //    funding cycle. No money leaves their account yet — each budget-item
  //    payment captures its portion from this hold, and every capture is a
  //    real card transaction visible on the PayPal dashboard.
  const holdResult = await paypal.authorizeHold({
    amount,
    vaultToken: paymentMethod.vault_token,
    reference: `FUND-${budget.id}-${dateStr}-${Date.now()}`,
    description: `Budget funding hold: ${budget.name || 'Monthly budget'}`,
  });

  const charge = holdResult; // keep failure-path naming below

  if (charge.status !== 'completed') {
    // 5. Failure path
    await attempt.update({
      status: 'failed',
      failure_reason: (charge.failureReason || 'PAYMENT_METHOD_COULD_NOT_BE_CHARGED').slice(0, 255),
      mode: charge.mode,
      provider_reference: charge.providerReference || null,
      metadata: { is_retry: isRetry },
    });

    await PaymentMethod.update(
      {
        last_charge_failed_at: new Date(),
        consecutive_failures: sequelize.literal('consecutive_failures + 1'),
      },
      { where: { id: paymentMethod.id } }
    );

    await notifyUser(
      budget.user_id,
      'funding_failed',
      'Budget funding failed',
      `Your "${budget.name || 'monthly'}" budget could not be funded (K${amount.toFixed(2)}). Reason: ${charge.failureReason || 'Payment method could not be charged.'} You can update your payment method or retry.`,
      '/budgets'
    );

    return { status: 'failed', attempt };
  }

  // 6. Success path — record the hold + credit wallet + allocations atomically
  const walletTx = await sequelize.transaction(async (t) => {
    // Auto-create the wallet if the student never opened the wallet screen
    let wallet = await Wallet.findOne({
      where: { user_id: budget.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: budget.user_id, balance: 0 }, { transaction: t });
    }

    wallet.balance = parseFloat(wallet.balance) + amount;
    await wallet.save({ transaction: t });

    // The card authorization (hold) backing this cycle. Spends capture
    // against it; unspent balance is voided when the cycle ends.
    const hold = await BudgetHold.create({
      budget_id: budget.id,
      funding_attempt_id: attempt.id,
      payment_method_id: paymentMethod.id,
      provider_hold_id: charge.holdId,
      provider_reference: charge.providerReference || null,
      amount,
      amount_captured: 0,
      currency: process.env.PAYPAL_CURRENCY || 'ZMW',
      status: 'open',
      mode: charge.mode,
      expires_at: charge.expiresAt ? new Date(charge.expiresAt) : null,
    }, { transaction: t });

    const walletTx = await WalletTransaction.create({
      wallet_id: wallet.id,
      type: 'funding',
      amount,
      balance_after: wallet.balance,
      status: 'completed',
      provider: 'paypal',
      provider_reference: charge.providerReference,
      description: `Budget funding (card hold) — ${budget.name || 'Monthly budget'}`,
      meta: { budget_id: budget.id, scheduled_date: dateStr, mode: charge.mode, hold_id: hold.id },
    }, { transaction: t });

    // Mark the budget's allocations funded
    await BudgetAllocation.update(
      { funded_at: new Date() },
      { where: { budget_id: budget.id }, transaction: t }
    );

    return walletTx;
  });

  await attempt.update({
    status: 'completed',
    mode: charge.mode,
    provider_reference: charge.providerReference || null,
    wallet_transaction_id: walletTx.id,
  });

  await budget.update({
    is_funded: true,
    last_funded_at: new Date(),
    next_funding_date: computeNextFundingDate(budget, new Date(scheduledDate)),
  });

  await PaymentMethod.update(
    { last_charged_at: new Date(), consecutive_failures: 0 },
    { where: { id: paymentMethod.id } }
  );

  await notifyUser(
    budget.user_id,
    'funding',
    'Budget funded successfully',
    `K${amount.toFixed(2)} has been credited to your wallet and allocated to "${budget.name || 'your budget'}".`,
    '/budgets'
  );

  return { status: 'completed', attempt };
}

/**
 * Find all budgets whose funding is due and run the funding flow for each.
 * Called by the node-cron scheduler and the manual trigger endpoint.
 */
async function runDueFunding() {
  const today = new Date().toISOString().slice(0, 10);
  const dueBudgets = await Budget.findAll({
    where: {
      is_active: true,
      next_funding_date: { [Op.lte]: today },
    },
    include: [{ model: BudgetAllocation, as: 'allocations' }],
  });

  const results = [];
  for (const budget of dueBudgets) {
    try {
      const result = await fundBudget(budget, budget.next_funding_date);
      results.push({ budget_id: budget.id, scheduled_date: budget.next_funding_date, ...result });
    } catch (error) {
      results.push({ budget_id: budget.id, error: error.message });
    }
  }
  return results;
}

/**
 * Retry a failed funding attempt for a budget (student-initiated).
 * Reuses the original scheduled date so the cycle stays consistent.
 */
async function retryFunding(budget) {
  const lastAttempt = await FundingAttempt.findOne({
    where: { budget_id: budget.id },
    order: [['created_at', 'DESC']],
  });

  const scheduledDate = lastAttempt?.scheduled_date || budget.next_funding_date || new Date().toISOString().slice(0, 10);
  return fundBudget(budget, scheduledDate, { isRetry: true });
}

/**
 * Release (void) the unspent remainder of a budget's open card hold.
 * Used when a budget is deactivated/cancelled — unspent money goes back to
 * the card instead of sitting unusable in the wallet.
 */
async function releaseHold(budget, { reason = 'budget_cancelled' } = {}) {
  const hold = await BudgetHold.findOne({
    where: { budget_id: budget.id, status: 'open' },
    order: [['created_at', 'DESC']],
  });
  if (!hold) return { status: 'no_hold' };

  const captured = parseFloat(hold.amount_captured);
  const total = parseFloat(hold.amount);
  const unspent = total - captured;

  const result = await paypal.voidHold(hold.provider_hold_id);
  if (result.status !== 'completed') {
    return { status: 'failed', reason: result.failureReason };
  }

  await sequelize.transaction(async (t) => {
    const wallet = await Wallet.findOne({
      where: { user_id: budget.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (wallet && unspent > 0) {
      wallet.balance = Math.max(parseFloat(wallet.balance) - unspent, 0);
      await wallet.save({ transaction: t });

      await WalletTransaction.create({
        wallet_id: wallet.id,
        type: 'hold_release',
        amount: unspent,
        balance_after: wallet.balance,
        status: 'completed',
        provider: 'paypal',
        description: `Hold released — unspent budget money returned to card (${reason})`,
        meta: { hold_id: hold.id, budget_id: budget.id, reason },
      }, { transaction: t });
    }

    hold.status = captured > 0 ? 'captured' : 'voided';
    hold.voided_at = new Date();
    await hold.save({ transaction: t });
  });

  return { status: 'released', unspent };
}

/**
 * Sweep holds that are about to expire:
 *   - Open holds nearing expiry are reauthorized (extended) so the budget
 *     stays spendable for the rest of its cycle.
 *   - Holds past expiry are marked expired (issuer releases them
 *     automatically; captures against them would fail).
 * Called by the scheduler alongside funding runs.
 */
async function sweepHolds() {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // refresh within 24h of expiry
  const soonStr = soon.toISOString().slice(0, 19).replace('T', ' ');
  const openHolds = await BudgetHold.findAll({ where: { status: 'open' } });

  let reauthorized = 0;
  let expired = 0;
  for (const hold of openHolds) {
    if (!hold.expires_at) continue; // simulated holds without expiry
    const exp = new Date(hold.expires_at);
    if (exp <= now) {
      await hold.update({ status: 'expired' });
      expired += 1;
      continue;
    }
    if (exp <= soon) {
      const remaining = parseFloat(hold.amount) - parseFloat(hold.amount_captured);
      if (remaining <= 0) continue;
      const re = await paypal.reauthorizeHold({
        holdId: hold.provider_hold_id,
        amount: parseFloat(hold.amount),
      });
      if (re.status === 'completed') {
        await hold.update({
          provider_hold_id: re.holdId || hold.provider_hold_id,
          expires_at: re.expiresAt ? new Date(re.expiresAt) : null,
        });
        reauthorized += 1;
      }
    }
  }
  return { checked: openHolds.length, reauthorized, expired };
}

module.exports = { fundBudget, runDueFunding, retryFunding, releaseHold, sweepHolds };
