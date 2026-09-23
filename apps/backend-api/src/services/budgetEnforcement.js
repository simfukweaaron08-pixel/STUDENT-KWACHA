/**
 * Budget enforcement service
 *
 * Implements "budget-restricted spending": the wallet only ever holds money
 * captured from budget funding holds, so every payment must belong to a
 * budget allocation:
 *
 *   - Payments without a category are always blocked — the student must
 *     pick the budget expense they are paying for.
 *   - The payment's category must have an allocation in an active funded
 *     budget, and the payment must fit within that allocation's remaining
 *     amount — otherwise it is rejected.
 *   - Each allocation ring-fences its own money; cross-category spending is
 *     impossible.
 *
 * The wallet controller additionally captures each payment from the budget's
 * card hold (services/paypal.js captureFromHold), so every budget spend is a
 * real card transaction on PayPal.
 */

const { Budget, BudgetAllocation } = require('../models');

/**
 * Check whether a proposed wallet payment is allowed by the student's
 * budget-restricted spending rules.
 *
 * @param {string} userId
 * @param {object} params
 * @param {number} params.amount   - proposed payment amount
 * @param {string|null} params.categoryId - category the payment is for
 * @param {string} [params.excludeTransactionId] - exclude a tx (for updates)
 * @returns {Promise<{ allowed: boolean, violations: Array<object> }>}
 */
async function checkBudgetRestrictions(userId, { amount, categoryId, excludeTransactionId } = {}) {
  const violations = [];
  const amt = parseFloat(amount);

  // Funded, active budgets with allocations
  const budgets = await Budget.findAll({
    where: { user_id: userId, is_active: true, is_funded: true },
    include: [{
      model: BudgetAllocation,
      as: 'allocations',
      required: false,
    }],
  });

  if (budgets.length === 0) {
    return { allowed: true, violations };
  }

  // Total allocated across all funded budgets
  let totalAllocated = 0;
  let allocationForCategory = null;

  for (const budget of budgets) {
    for (const alloc of budget.allocations || []) {
      const allocated = parseFloat(alloc.allocated_amount) || 0;
      const spent = parseFloat(alloc.spent_amount) || 0;
      totalAllocated += allocated;

      if (categoryId && alloc.category_id === categoryId) {
        allocationForCategory = { budget, alloc, allocated, spent, remaining: allocated - spent };
      }
    }
  }

  // Payment without a category: funded money is ring-fenced, so block
  // (the student must pick the expense category they're spending on).
  if (!categoryId) {
    if (totalAllocated > 0) {
      violations.push({
        control: 'budget_restriction',
        message:
          'Funds are allocated to budgets. Choose the expense category this payment is for so it is drawn from the right budget.',
      });
    }
    return { allowed: violations.length === 0, violations };
  }

  // Categorised payment: if this category has an allocation, enforce it.
  if (allocationForCategory) {
    const { budget, alloc, allocated, spent, remaining } = allocationForCategory;
    if (amt > remaining) {
      violations.push({
        control: 'budget_restriction',
        budget_id: budget.id,
        allocation_id: alloc.id,
        category_id: categoryId,
        allocated,
        spent,
        remaining,
        message: `Only K${remaining.toFixed(2)} remains in the ${allocated.toFixed(2)} allocated for this expense category. This payment of K${amt.toFixed(2)} exceeds it.`,
      });
    }
    return { allowed: violations.length === 0, violations };
  }

  // Category has no allocation in any funded budget → allowed only if paid
  // from unallocated wallet money. We can't distinguish which money is spent,
  // but funded budgets exist — restrict spending to allocated categories.
  violations.push({
    control: 'budget_restriction',
    message:
      'This expense category has no allocation in your funded budgets. Funded money can only be spent on its allocated category.',
  });

  return { allowed: violations.length === 0, violations };
}

/**
 * Pick the funded-budget allocation a payment should be drawn from — the
 * first funded budget whose allocation for the category has enough
 * remaining funds. Mirrors recordAllocationSpend's selection so the card
 * hold captured and the allocation debited always belong to the same budget.
 */
async function findAllocationForSpend(userId, categoryId, amount) {
  const budgets = await Budget.findAll({
    where: { user_id: userId, is_active: true, is_funded: true },
    include: [{ model: BudgetAllocation, as: 'allocations', where: { category_id: categoryId }, required: true }],
  });

  for (const budget of budgets) {
    const alloc = budget.allocations[0];
    const remaining = parseFloat(alloc.allocated_amount) - parseFloat(alloc.spent_amount);
    if (remaining >= parseFloat(amount)) {
      return { budget, alloc, remaining };
    }
  }
  return null;
}

/**
 * Record spending against a budget allocation (after a successful capture).
 * Should be called inside the same DB transaction as the payment.
 *
 * @param {object} t - Sequelize transaction
 */
async function recordAllocationSpend(userId, { categoryId, amount, transaction: t }) {
  const found = await findAllocationForSpend(userId, categoryId, amount);
  if (!found) return null;

  const { alloc, budget } = found;
  alloc.spent_amount = parseFloat(alloc.spent_amount) + parseFloat(amount);
  await alloc.save({ transaction: t });
  return { allocation_id: alloc.id, budget_id: budget.id, spent_amount: alloc.spent_amount };
}

/**
 * Release spending recorded against an allocation (e.g. payment reversed).
 */
async function releaseAllocationSpend(allocationId, amount, { transaction: t } = {}) {
  const alloc = await BudgetAllocation.findByPk(allocationId);
  if (!alloc) return null;

  alloc.spent_amount = Math.max(parseFloat(alloc.spent_amount) - parseFloat(amount), 0);
  await alloc.save({ transaction: t });
  return alloc;
}

module.exports = {
  checkBudgetRestrictions,
  findAllocationForSpend,
  recordAllocationSpend,
  releaseAllocationSpend,
};
