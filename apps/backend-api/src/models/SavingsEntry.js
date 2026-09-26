const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SavingsEntry = sequelize.define('SavingsEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  savings_goal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'savings_goals', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  entry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
}, {
  tableName: 'savings_entries',
});

module.exports = SavingsEntry;
