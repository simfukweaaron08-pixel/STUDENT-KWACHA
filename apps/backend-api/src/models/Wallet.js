const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ZMW',
  },
  status: {
    type: DataTypes.ENUM('active', 'frozen', 'closed'),
    defaultValue: 'active',
  },
  // Spending controls
  daily_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true, // NULL = no limit
  },
  monthly_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true, // NULL = no limit
  },
  daily_spent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  daily_spent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },
  monthly_spent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  monthly_spent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },
}, {
  tableName: 'wallets',
});

module.exports = Wallet;
