const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('income', 'expense', 'transfer'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category_id: {
    type: DataTypes.UUID,
    references: { model: 'categories', key: 'id' },
  },
  category_source: {
    type: DataTypes.ENUM('auto', 'manual'),
    defaultValue: 'auto',
  },
  source: {
    type: DataTypes.STRING(100),
  },
  reference_number: {
    type: DataTypes.STRING(100),
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  synced_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
  },
}, {
  tableName: 'transactions',
  indexes: [
    {
      fields: ['user_id', 'transaction_date', 'category_id'],
    },
    {
      fields: ['user_id', 'type'],
    },
  ],
});

module.exports = Transaction;
