const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actor_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  actor_type: {
    type: DataTypes.ENUM('user', 'admin', 'system'),
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  resource_type: {
    type: DataTypes.STRING(100),
  },
  resource_id: {
    type: DataTypes.UUID,
  },
  details: {
    type: DataTypes.JSONB,
  },
  ip_address: {
    type: DataTypes.INET,
  },
}, {
  tableName: 'audit_logs',
});

module.exports = AuditLog;
