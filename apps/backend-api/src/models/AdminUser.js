const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminUser = sequelize.define('AdminUser', {
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
  role: {
    type: DataTypes.ENUM('admin', 'super_admin'),
    defaultValue: 'admin',
  },
}, {
  tableName: 'admin_users',
});

module.exports = AdminUser;
