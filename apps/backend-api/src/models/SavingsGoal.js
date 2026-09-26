const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SavingsGoal = sequelize.define('SavingsGoal', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  target_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  current_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'biweekly', 'monthly'),
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
    defaultValue: 'active',
  },
}, {
  tableName: 'savings_goals',
});

module.exports = SavingsGoal;
