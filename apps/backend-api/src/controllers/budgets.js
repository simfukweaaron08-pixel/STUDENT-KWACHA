const { Budget, BudgetAllocation, Category, Transaction, PaymentMethod, FundingAttempt, sequelize } = require('../models');
const { getCurrentPeriodRange } = require('../utils/dates');
const { Op } = require('sequelize');
const {
  computeBudgetSpending,
  evaluateBudgetAlerts,
  checkSpendingControls,
  predictBudgetExhaustion,
} = require('../services/budgetAlerts');
const { retryFunding, fundBudget } = require('../services/fundingEngine');

/**
 * Next occurrence of a day-of-month (1-28) on or after `from`.
 * Used to schedule the first funding date when a budget is activated.
 */
function nextDayOccurrence(day, from = new Date()) {
  const d = Math.min(Math.max(parseInt(day, 10) || 1, 1), 28);
  if (from.getDate() <= d) {
    return new Date(from.getFullYear(), from.getMonth(), d);
  }
  return new Date(from.getFullYear(), from.getMonth() + 1, d);
}

/** Include payload for allocations with their categories. */
const ALLOCATIONS_INCLUDE = [{
  model: BudgetAllocation,
  as: 'allocations',
  required: false,
  include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
}];

/** Serialize a budget with allocations + per-category spend. */
async function serializeBudget(budget) {
  const json = budget.toJSON();
  const { spent, remaining, percentage } = await computeBudgetSpending(budget);

  const allocations = (json.allocations || []).map((a) => ({
    id: a.id,
    category_id: a.category_id,
    category: a.category,
    allocated_amount: parseFloat(a.allocated_amount),
    spent_amount: parseFloat(a.spent_amount),
    remaining: Math.max(parseFloat(a.allocated_amount) - parseFloat(a.spent_amount), 0),
    funded: Boolean(a.funded_at),
  }));

  return {
    ...json,
    amount: parseFloat(json.amount),
    funded_amount: parseFloat(json.funded_amount || 0),
    spent_amount: spent,
    remaining,
    percentage_used: percentage,
    status: percentage > 100 ? 'exceeded' : percentage >= (parseFloat(budget.alert_threshold) || 80) ? 'warning' : 'ok',
    allocations,
    total_allocated: allocations.reduce((s, a) => s + a.allocated_amount, 0),
  };
}

// GET /api/v1/budgets
const listBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.findAll({
      where: { user_id: req.userId },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
        ...ALLOCATIONS_INCLUDE,
      ],
      order: [['created_at', 'DESC']],
    });

    const results = await Promise.all(budgets.map(serializeBudget));
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/alerts — evaluate + return budget warnings/notifications
const getBudgetAlerts = async (req, res, next) => {
  try {
    const alerts = await evaluateBudgetAlerts(req.userId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/prediction — ML overspending / exhaustion prediction
const getBudgetPrediction = async (req, res, next) => {
  try {
    const prediction = await predictBudgetExhaustion(req.userId);
    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/funding-status — funding overview for the dashboard
const getFundingStatus = async (req, res, next) => {
  try {
    const budgets = await Budget.findAll({
      where: { user_id: req.userId, is_active: true },
      include: ALLOCATIONS_INCLUDE,
      order: [['next_funding_date', 'ASC']],
    });

    const today = new Date().toISOString().slice(0, 10);
    const fundingDue = [];
    const failed = [];
    const upcoming = [];

    for (const budget of budgets) {
      const item = {
        budget_id: budget.id,
        name: budget.name,
        amount: parseFloat(budget.amount),
        frequency: budget.frequency,
        funding_day: budget.funding_day,
        next_funding_date: budget.next_funding_date,
        is_funded: budget.is_funded,
        payment_method_id: budget.payment_method_id,
      };

      // Latest failed attempt for this budget
      const lastAttempt = await FundingAttempt.findOne({
        where: { budget_id: budget.id },
        order: [['created_at', 'DESC']],
      });
      if (lastAttempt && lastAttempt.status === 'failed') {
        failed.push({ ...item, failure_reason: lastAttempt.failure_reason, failed_at: lastAttempt.updated_at });
      }

      if (budget.next_funding_date && budget.next_funding_date <= today) {
        fundingDue.push(item);
      } else if (budget.next_funding_date) {
        upcoming.push(item);
      }
    }

    // Wallet funding balance: money held for budgets (allocated but unspent)
    const allocations = await BudgetAllocation.findAll({
      where: { funded_at: { [Op.ne]: null } },
      include: [{
        model: Budget,
        as: 'budget',
        where: { user_id: req.userId, is_active: true },
        attributes: [],
      }],
    });
    const heldForBudgets = allocations.reduce(
      (s, a) => s + Math.max(parseFloat(a.allocated_amount) - parseFloat(a.spent_amount), 0),
      0
    );

    res.json({
      success: true,
      data: {
        funding_due: fundingDue,
        failed_funding: failed,
        upcoming_funding: upcoming,
        wallet_funding_balance: heldForBudgets,
        payment_mode: process.env.PAYPAL_CLIENT_ID ? 'live' : 'simulated',
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/:id
const getBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
        ...ALLOCATIONS_INCLUDE,
      ],
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    const data = await serializeBudget(budget);

    const { start, end } = getCurrentPeriodRange(budget.period);
    const transactions = await Transaction.findAll({
      where: {
        user_id: req.userId,
        type: 'expense',
        transaction_date: { [Op.gte]: start, [Op.lt]: end },
        ...(budget.category_id ? { category_id: budget.category_id } : {}),
      },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
      order: [['transaction_date', 'DESC']],
    });

    // Recent funding attempts
    const fundingAttempts = await FundingAttempt.findAll({
      where: { budget_id: budget.id },
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    res.json({
      success: true,
      data: {
        ...data,
        transaction_count: transactions.length,
        funding_attempts: fundingAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/budgets — create budget (draft) with optional allocations
const createBudget = async (req, res, next) => {
  try {
    const {
      category_id, name, amount, period, start_date, end_date,
      alert_threshold, enforce, frequency, funding_day,
      payment_method_id, allocations,
    } = req.validated.body;

    const budget = await sequelize.transaction(async (t) => {
      const created = await Budget.create({
        user_id: req.userId,
        category_id: category_id || null,
        name: name || null,
        amount,
        period: period || 'monthly',
        start_date,
        end_date: end_date || null,
        alert_threshold: alert_threshold || 80,
        enforce: enforce || false,
        frequency: frequency || 'monthly',
        funding_day: funding_day || null,
        payment_method_id: payment_method_id || null,
        is_active: false, // activated via /activate
      }, { transaction: t });

      if (Array.isArray(allocations) && allocations.length > 0) {
        await BudgetAllocation.bulkCreate(
          allocations.map((a) => ({
            budget_id: created.id,
            category_id: a.category_id,
            allocated_amount: a.amount,
            spent_amount: 0,
          })),
          { transaction: t }
        );
      }

      return created;
    });

    const result = await Budget.findByPk(budget.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
        ...ALLOCATIONS_INCLUDE,
      ],
    });

    res.status(201).json({ success: true, data: await serializeBudget(result) });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/budgets/:id/activate — confirm & activate the budget
const activateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: ALLOCATIONS_INCLUDE,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    // Auto-funding budgets require a connected payment method
    const frequency = budget.frequency || 'monthly';
    const wantsAutoFunding = frequency !== 'one_time' || Boolean(budget.payment_method_id);
    if (wantsAutoFunding) {
      const pm = budget.payment_method_id
        ? await PaymentMethod.findOne({ where: { id: budget.payment_method_id, user_id: req.userId, status: 'active' } })
        : await PaymentMethod.findOne({ where: { user_id: req.userId, status: 'active' } });

      if (!pm) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_METHOD_REQUIRED',
            message: 'Connect a payment method (PayPal) before activating an auto-funded budget.',
          },
        });
      }
      if (!budget.payment_method_id) budget.payment_method_id = pm.id;
    }

    // Set the first funding date
    if (frequency !== 'one_time' && budget.funding_day) {
      budget.next_funding_date = nextDayOccurrence(budget.funding_day);
    } else if (frequency === 'one_time') {
      budget.next_funding_date = budget.start_date || new Date().toISOString().slice(0, 10);
    }

    budget.is_active = true;
    budget.is_funded = false;
    await budget.save();

    const result = await Budget.findByPk(budget.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
        ...ALLOCATIONS_INCLUDE,
      ],
    });

    res.json({ success: true, data: await serializeBudget(result) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/budgets/:id
const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    const updates = req.validated.body;
    if (updates.amount !== undefined) budget.amount = updates.amount;
    if (updates.name !== undefined) budget.name = updates.name;
    if (updates.period) budget.period = updates.period;
    if (updates.end_date !== undefined) budget.end_date = updates.end_date;
    if (updates.is_active !== undefined) budget.is_active = updates.is_active;
    if (updates.alert_threshold !== undefined) budget.alert_threshold = updates.alert_threshold;
    if (updates.enforce !== undefined) budget.enforce = updates.enforce;
    if (updates.frequency !== undefined) budget.frequency = updates.frequency;
    if (updates.funding_day !== undefined) budget.funding_day = updates.funding_day;
    if (updates.payment_method_id !== undefined) budget.payment_method_id = updates.payment_method_id;

    if (updates.funding_day !== undefined && budget.frequency !== 'one_time' && budget.is_active) {
      budget.next_funding_date = nextDayOccurrence(budget.funding_day);
    }

    await budget.save();

    // Replace allocations if provided
    if (Array.isArray(updates.allocations)) {
      await sequelize.transaction(async (t) => {
        await BudgetAllocation.destroy({ where: { budget_id: budget.id }, transaction: t });
        if (updates.allocations.length > 0) {
          await BudgetAllocation.bulkCreate(
            updates.allocations.map((a) => ({
              budget_id: budget.id,
              category_id: a.category_id,
              allocated_amount: a.amount,
              spent_amount: 0,
            })),
            { transaction: t }
          );
        }
      });
    }

    const result = await Budget.findByPk(budget.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
        ...ALLOCATIONS_INCLUDE,
      ],
    });

    res.json({ success: true, data: await serializeBudget(result) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/budgets/:id
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    await sequelize.transaction(async (t) => {
      await BudgetAllocation.destroy({ where: { budget_id: budget.id }, transaction: t });
      await FundingAttempt.destroy({ where: { budget_id: budget.id }, transaction: t });
      await budget.destroy({ transaction: t });
    });

    res.json({ success: true, data: { message: 'Budget deleted' } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/:id/spending
const getBudgetSpending = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: ALLOCATIONS_INCLUDE,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    const { start, end } = getCurrentPeriodRange(budget.period);
    const where = {
      user_id: req.userId,
      type: 'expense',
      transaction_date: { [Op.gte]: start, [Op.lt]: end },
    };
    if (budget.category_id) where.category_id = budget.category_id;

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
      order: [['transaction_date', 'DESC']],
    });

    // Group by category
    const categorySpending = {};
    transactions.forEach((t) => {
      const catName = t.category?.name || 'Uncategorized';
      if (!categorySpending[catName]) {
        categorySpending[catName] = { amount: 0, count: 0, category: t.category };
      }
      categorySpending[catName].amount += parseFloat(t.amount);
      categorySpending[catName].count += 1;
    });

    res.json({
      success: true,
      data: {
        budget_id: budget.id,
        period: { start, end },
        total_spent: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
        categories: categorySpending,
        allocations: (budget.allocations || []).map((a) => ({
          category_id: a.category_id,
          category: a.category,
          allocated_amount: parseFloat(a.allocated_amount),
          spent_amount: parseFloat(a.spent_amount),
          remaining: Math.max(parseFloat(a.allocated_amount) - parseFloat(a.spent_amount), 0),
        })),
        transactions: transactions.slice(0, 50),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/budgets/:id/retry-funding — retry a failed funding attempt
const retryBudgetFunding = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, user_id: req.userId, is_active: true },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    const result = await retryFunding(budget);

    if (result.status === 'failed') {
      return res.status(402).json({
        success: false,
        error: {
          code: 'FUNDING_FAILED',
          message: result.attempt?.failure_reason || 'Payment method could not be charged.',
          data: { attempt_id: result.attempt?.id },
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: result.alreadyFunded
          ? 'This budget is already funded for the current cycle.'
          : 'Payment successful — budget funded.',
        status: result.status,
        attempt: result.attempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSpending,
  getBudgetAlerts,
  getBudgetPrediction,
  getFundingStatus,
  activateBudget,
  retryBudgetFunding,
  checkSpendingControls,
};
