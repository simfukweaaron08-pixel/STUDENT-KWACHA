const { Sequelize } = require('sequelize');
require('dotenv').config();


/*
 * Database connection:
 * Sequelize is used to connect the backend to PostgreSQL.
 * The database connection details are loaded from DATABASE_URL
 * in the environment configuration instead of being hard-coded.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  // Connection pool settings help the application reuse database connections.
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = sequelize;
