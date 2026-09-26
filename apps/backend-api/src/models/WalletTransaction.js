const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  wallet_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'wallets', key: 'id' },
  },
  type: {
    type: DataTypes.ENUM('topup', 'payment', 'funding', 'allocation_hold', 'hold_release'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  balance_after: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'reversed'),
    defaultValue: 'pending',
  },
  // Payment provider details (PayPal card processing)
  provider: {
    type: DataTypes.STRING(50),
    allowNull: true, // e.g. 'paypal'
  },
  // PayPal authorization (hold) id this payment captured from
  hold_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'budget_holds', key: 'id' },
  },
  provider_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  provider_tx_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'wallet_transactions',
});

module.exports = WalletTransaction;
