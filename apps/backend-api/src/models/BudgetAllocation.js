const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * A per-category allocation of a budget's funded amount, e.g.
 *   Budget "September Monthly Expenses" (K3,000):
 *     Food K800, Transport K400, Rent K1,500, Internet K200, Other K100.
 *
 * When a budget is funded, each allocation is credited. Spending from the
 * wallet is restricted to the matching category allocation — money allocated
 * to Food can only be spent on Food.
 */
const BudgetAllocation = sequelize.define('BudgetAllocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  budget_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'budgets', key: 'id' },
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'categories', key: 'id' },
  },
  // Amount allocated to this category for the current funding cycle
  allocated_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  // Amount spent from this allocation
  spent_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },
  // When the current cycle's funds were credited (null = not yet funded)
  funded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'budget_allocations',
});

module.exports = BudgetAllocation;
