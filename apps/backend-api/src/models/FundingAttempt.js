const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * One charge attempt for a budget's scheduled funding date.
 * Records success/failure, reason and provider details; a failed attempt can
 * be retried by the student ("Retry Payment") or on the next scheduler run.
 */
const FundingAttempt = sequelize.define('FundingAttempt', {
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
  // Payment method used for the attempt (kept even if later disconnected)
  payment_method_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'payment_methods', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  // The scheduled cycle this attempt belongs to (YYYY-MM-DD of the funding date)
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  failure_reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  mode: {
    type: DataTypes.STRING(20),
    allowNull: true, // 'simulated' | 'live'
  },
  provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'paypal',
  },
  provider_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  wallet_transaction_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'wallet_transactions', key: 'id' },
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'funding_attempts',
  indexes: [
    { fields: ['budget_id', 'scheduled_date'] },
  ],
});

module.exports = FundingAttempt;
