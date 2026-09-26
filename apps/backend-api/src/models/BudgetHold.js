const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * A card HOLD (authorization) placed for one funding cycle of a budget.
 *
 * Flow: when a budget is funded, the budget amount is authorized on the
 * student's card (no money leaves their account). Each budget-item payment
 * then captures its portion from the hold — every capture is a real card
 * transaction on PayPal. Unspent balance is voided when the cycle ends.
 */
const BudgetHold = sequelize.define('BudgetHold', {
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
  funding_attempt_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'funding_attempts', key: 'id' },
  },
  payment_method_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'payment_methods', key: 'id' },
  },
  // PayPal authorization id (or SIMAUTH-… in simulated mode)
  provider_hold_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // Parent payment resource id from PayPal
  provider_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  // Total authorized (held) amount for the cycle
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  amount_captured: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'ZMW',
  },
  // 'open' → capturing in progress; 'captured' → fully taken;
  // 'voided' → released back to the card; 'expired' → swept after expiry
  status: {
    type: DataTypes.ENUM('open', 'captured', 'voided', 'expired'),
    allowNull: false,
    defaultValue: 'open',
  },
  mode: {
    type: DataTypes.STRING(20),
    allowNull: true, // 'sandbox' | 'simulated' | 'live'
  },
  // When the provider authorization expires (drives the sweep job)
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  captured_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  voided_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'budget_holds',
});

module.exports = BudgetHold;
