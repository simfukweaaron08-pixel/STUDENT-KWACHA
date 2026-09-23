const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'categories', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  period: {
    type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'yearly'),
    defaultValue: 'monthly',
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  alert_threshold: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 80.0,
  },
  // Strict budget: block transactions that would push spending past the limit
  enforce: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // ── Funding (auto-charge a linked payment method on the funding date) ──
  name: {
    type: DataTypes.STRING(255),
    allowNull: true, // e.g. "September Monthly Expenses"
  },
  frequency: {
    type: DataTypes.ENUM('one_time', 'weekly', 'monthly', 'quarterly', 'yearly'),
    defaultValue: 'monthly',
  },
  // Day of the period on which funding is collected (1-28 to stay valid in every month)
  funding_day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 28 },
  },
  payment_method_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'payment_methods', key: 'id' },
  },
  // Total amount collected (funded) to date
  funded_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },
  // Whether the current funding cycle has been collected successfully
  is_funded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Next date the payment method will be charged
  next_funding_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  last_funded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'budgets',
});

module.exports = Budget;
