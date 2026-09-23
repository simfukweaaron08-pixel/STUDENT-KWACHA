/**
 * Budget alert service
 *
 * Central place for budget monitoring: given a user's spending on a budget,
 * it generates notifications (budget alerts / warnings), creates financial
 * insights, enforces spending controls for "strict" budgets, and evaluates
 * ML overspending predictions.
 */

const { Budget, Category, Transaction, Notification, FinancialInsight, Wallet } = require('../models');
const { getCurrentPeriodRange } = require('../utils/dates');
const { Op } = require('sequelize');

/**
 * Compute spending for a budget within its current period.
 * Optionally excludes a specific transaction (e.g. the one being tested pre-creation).
 */
async function computeBudgetSpending(budget, { excludeTransactionId } = {}) {
  const { start, end } = getCurrentPeriodRange(budget.period);
  const where = {
    user_id: budget.user_id,
    type: 'expense',
    transaction_date: { [Op.gte]: start, [Op.lt]: end },
  };
  if (budget.category_id) where.category_id = budget.category_id;
  if (excludeTransactionId) where.id = { [Op.ne]: excludeTransactionId };

  const spent = (await Transaction.sum('amount', { where })) || 0;
  return {
    spent: parseFloat(spent),
    limit: parseFloat(budget.amount),
    remaining: parseFloat(budget.amount) - parseFloat(spent),
    percentage: parseFloat(budget.amount) > 0 ? (parseFloat(spent) / parseFloat(budget.amount)) * 100 : 0,
    period: { start, end },
  };
}

/**
 * Create a notification for a user (deduplicated per period).
 */
async function createNotification({ userId, type, title, body, actionUrl }) {
  const existing = await Notification.findOne({
    where: {
      user_id: userId,
      type,
      title,
      created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (existing) return existing;

  return Notification.create({
    user_id: userId,
    type,
    title,
    body,
    action_url: actionUrl || null,
  });
}

/**
 * Check all active budgets for a user, generating alerts when thresholds
 * are crossed (default 80%) and when budgets are exceeded.
 * Returns the list of alerts that are (or became) active.
 */
async function evaluateBudgetAlerts(userId) {
  const budgets = await Budget.findAll({
    where: { user_id: userId, is_active: true },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
  });

  const alerts = [];

  for (const budget of budgets) {
    const { spent, limit, remaining, percentage } = await computeBudgetSpending(budget);
    const threshold = parseFloat(budget.alert_threshold) || 80;
    const name = budget.category?.name || 'Overall budget';
    const isOver = spent > limit;

    if (isOver) {
      alerts.push({
        budget_id: budget.id,
        name,
        spent,
        limit,
        remaining,
        percentage,
        status: 'exceeded',
        message: `You've exceeded your ${name} budget by K${(spent - limit).toFixed(2)}.`,
      });

      if (budget.enforce) {
        continue; // Strict budget: block further spending, alert below
      }

      await createNotification({
        userId,
        type: 'budget_alert',
        title: `Budget exceeded: ${name}`,
        body: alerts[alerts.length - 1].message,
      });
    } else if (percentage >= threshold) {
      alerts.push({
        budget_id: budget.id,
        name,
        spent,
        limit,
        remaining,
        percentage,
        status: 'warning',
        message: `You've used ${percentage.toFixed(0)}% of your ${name} budget (K${spent.toFixed(2)} of K${limit.toFixed(2)}). K${remaining.toFixed(2)} left.`,
      });

      await createNotification({
        userId,
        type: 'budget_alert',
        title: `Budget warning: ${name}`,
        body: alerts[alerts.length - 1].message,
      });
    }
  }

  return alerts;
}

/**
 * Spending control: check whether a proposed expense would violate a
 * strict (enforced) budget for the user.
 *
 * @returns {{ allowed: boolean, blockedBy: Array<{budget_id, name, spent, limit, wouldExceedBy}> }}
 */
async function checkSpendingControls(userId, { amount, categoryId, excludeTransactionId }) {
  const budgets = await Budget.findAll({
    where: { user_id: userId, is_active: true, enforce: true },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });

  const blockedBy = [];

  for (const budget of budgets) {
    // A budget applies if it's category-specific and matches, or is overall (category_id NULL)
    if (budget.category_id && categoryId && budget.category_id !== categoryId) continue;
    if (budget.category_id && !categoryId) continue;

    const { spent, limit } = await computeBudgetSpending(budget, { excludeTransactionId });
    if (spent + parseFloat(amount) > limit) {
      blockedBy.push({
        budget_id: budget.id,
        name: budget.category?.name || 'Overall budget',
        spent,
        limit,
        wouldExceedBy: spent + parseFloat(amount) - limit,
      });
    }
  }

  return { allowed: blockedBy.length === 0, blockedBy };
}

/**
 * Evaluate the ML overspending / budget-exhaustion prediction for a user's
 * current month. Falls back to a deterministic heuristic when the ML service
 * is unavailable, so the feature degrades gracefully.
 */
async function predictBudgetExhaustion(userId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysElapsed = Math.max(dayOfMonth, 1);
  const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);

  // Daily expenses this month
  const dailyExpenses = (await Transaction.findAll({
    attributes: ['transaction_date', 'amount'],
    where: {
      user_id: userId,
      type: 'expense',
      transaction_date: { [Op.gte]: monthStart },
    },
  })).map((t) => ({
    date: t.transaction_date.toISOString().slice(0, 10),
    amount: parseFloat(t.amount),
  }));

  // Current total budget
  const activeBudgets = await Budget.findAll({ where: { user_id: userId, is_active: true } });
  const totalBudget = activeBudgets.reduce((s, b) => s + parseFloat(b.amount), 0);

  if (totalBudget <= 0 || dailyExpenses.length === 0) {
    return {
      prediction_available: false,
      message: 'Add expenses and a budget to enable overspending prediction.',
    };
  }

  // Total expenses this month
  const totalSpent = dailyExpenses.reduce((s, e) => s + e.amount, 0);
  const avgDailySpend = totalSpent / daysElapsed;
  const projectedTotal = avgDailySpend * daysInMonth;

  // Try ML service first
  let result = null;
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    const mlResponse = await fetch(`${mlUrl}/ml/v1/predictions/overspending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_expenses: dailyExpenses,
        total_budget: totalBudget,
        days_elapsed: daysElapsed,
        days_in_month: daysInMonth,
      }),
    });
    if (mlResponse.ok) {
      result = await mlResponse.json();
    }
  } catch {
    // ML service unavailable — use heuristic fallback
  }

  if (!result) {
    // Heuristic fallback: linear projection + pace ratio
    const budgetPace = totalSpent / (totalBudget * (daysElapsed / daysInMonth));
    const willExhaust = projectedTotal >= totalBudget;
    const daysToExhaustion = avgDailySpend > 0 ? Math.floor((totalBudget - totalSpent) / avgDailySpend) : null;

    result = {
      predicted_month_end_spend: Math.round(projectedTotal * 100) / 100,
      total_budget: totalBudget,
      overspend_amount: Math.max(Math.round((projectedTotal - totalBudget) * 100) / 100, 0),
      will_overspend: willExhaust,
      will_exhaust_before_month_end: willExhaust,
      estimated_exhaustion_date: daysToExhaustion !== null && willExhaust
        ? new Date(now.getTime() + daysToExhaustion * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null,
      days_to_exhaustion: daysToExhaustion,
      budget_pace_ratio: Math.round(budgetPace * 100) / 100,
      risk_level: budgetPace > 1.25 ? 'high' : budgetPace > 1.0 ? 'medium' : 'low',
      confidence: 'low',
      model: 'heuristic_fallback',
      message: willExhaust
        ? `At your current pace (K${avgDailySpend.toFixed(2)}/day), you're projected to spend K${projectedTotal.toFixed(2)} — K${Math.max(projectedTotal - totalBudget, 0).toFixed(2)} over your K${totalBudget.toFixed(2)} budget.`
        : `At your current pace, you're projected to spend K${projectedTotal.toFixed(2)} of your K${totalBudget.toFixed(2)} budget — you're on track.`,
    };
  }

  // Persist an insight + notification for high-risk predictions (deduped daily)
  if (result.will_overspend || result.risk_level === 'high') {
    await createNotification({
      userId,
      type: 'insight',
      title: 'Overspending risk detected',
      body: result.message,
    });

    await FinancialInsight.create({
      user_id: userId,
      insight_type: 'trend_alert',
      title: 'Overspending risk detected',
      body: result.message,
      priority: result.risk_level === 'high' ? 'high' : 'medium',
    });
  }

  return result;
}

module.exports = {
  computeBudgetSpending,
  createNotification,
  evaluateBudgetAlerts,
  checkSpendingControls,
  predictBudgetExhaustion,
};
