/**
 * Funding scheduler
 *
 * Lightweight periodic job (no external cron dependency) that drives the
 * recurring-budget flow:
 *
 *   1. runDueFunding()         — charge linked PayPal for budgets due today
 *   2. checkApproachingDates() — remind students a funding date is near
 *   3. checkLowBudgets()       — warn when an allocation is running low
 *
 * Interval is controlled with FUNDING_CHECK_INTERVAL_MINUTES (default 60).
 * runSchedulerNow() is exposed for manual/demo triggers.
 */

const { Budget, BudgetAllocation } = require('../models');
const { Op } = require('sequelize');
const { runDueFunding, sweepHolds } = require('./fundingEngine');
const { createNotification } = require('./budgetAlerts');

const CHECK_INTERVAL_MS =
  (parseInt(process.env.FUNDING_CHECK_INTERVAL_MINUTES, 10) || 60) * 60 * 1000;

/** Remind N days before the next funding date. */
const APPROACHING_DAYS = 3;

let timer = null;

/**
 * Notify students whose budget funding date is within APPROACHING_DAYS days.
 * Deduped per budget + cycle via createNotification's 24h window.
 */
async function checkApproachingDates() {
  const today = new Date();
  const horizon = new Date(today.getTime() + APPROACHING_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const budgets = await Budget.findAll({
    where: {
      is_active: true,
      next_funding_date: {
        [Op.ne]: null,
        [Op.gt]: todayStr,
        [Op.lte]: horizon,
      },
    },
  });

  for (const budget of budgets) {
    const days = Math.ceil(
      (new Date(budget.next_funding_date) - today) / (24 * 60 * 60 * 1000)
    );
    await createNotification({
      userId: budget.user_id,
      type: 'funding',
      title: 'Funding date approaching',
      body: `Your "${budget.name || 'budget'}" will be funded with K${parseFloat(budget.amount).toFixed(2)} in ${days} day${days === 1 ? '' : 's'} (${budget.next_funding_date}).`,
      actionUrl: '/budgets',
    });
  }
}

/**
 * Warn when a funded allocation is running low (≤ 20% remaining) but not yet
 * exhausted. Deduped by createNotification's 24h window.
 */
async function checkLowBudgets() {
  const budgets = await Budget.findAll({
    where: { is_active: true, is_funded: true },
    include: [{ model: BudgetAllocation, as: 'allocations', required: false }],
  });

  for (const budget of budgets) {
    for (const alloc of budget.allocations || []) {
      const allocated = parseFloat(alloc.allocated_amount) || 0;
      const spent = parseFloat(alloc.spent_amount) || 0;
      const remaining = allocated - spent;

      if (allocated > 0 && remaining > 0 && remaining / allocated <= 0.2) {
        const category = await BudgetAllocation.sequelize.models.Category.findByPk(alloc.category_id);
        const name = category?.name || 'budget';
        await createNotification({
          userId: budget.user_id,
          type: 'budget_low',
          title: `${name} budget running low`,
          body: `Only K${remaining.toFixed(2)} of K${allocated.toFixed(2)} remains for ${name} in "${budget.name || 'your budget'}".`,
          actionUrl: '/budgets',
        });
      }
    }
  }
}

/** Run all scheduled tasks once. */
async function runSchedulerNow() {
  const results = { funding: [], holds: null, approaching: 0, low: 0, ran_at: new Date().toISOString() };
  try {
    results.funding = await runDueFunding();
  } catch (error) {
    results.funding_error = error.message;
  }
  // Keep card holds alive (reauthorize near expiry, expire the stale ones)
  try {
    results.holds = await sweepHolds();
  } catch (error) {
    results.holds_error = error.message;
  }
  try {
    await checkApproachingDates();
  } catch (error) {
    results.approaching_error = error.message;
  }
  try {
    await checkLowBudgets();
  } catch (error) {
    results.low_error = error.message;
  }
  return results;
}

/** Start the interval loop. */
function startScheduler() {
  if (timer) return;
  console.log(`⏰ Funding scheduler started (every ${CHECK_INTERVAL_MS / 60000} min)`);
  // Run once shortly after boot so same-day funding isn't missed
  setTimeout(() => {
    runSchedulerNow().catch((e) => console.error('Scheduler run failed:', e.message));
  }, 10_000);
  timer = setInterval(() => {
    runSchedulerNow().catch((e) => console.error('Scheduler run failed:', e.message));
  }, CHECK_INTERVAL_MS);
  // Don't keep the process alive just for the scheduler
  timer.unref?.();
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startScheduler, stopScheduler, runSchedulerNow, checkApproachingDates, checkLowBudgets };
