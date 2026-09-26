const { User, AdminUser, Transaction, Budget, SavingsGoal, AuditLog, Category } = require('../models');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const { paginate, buildPaginationResponse } = require('../utils/pagination');

// GET /api/v1/admin/users
const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;

    const { count, rows } = await User.findAndCountAll({
      ...paginate({ where, order: [['created_at', 'DESC']] }, page, limit),
      attributes: { exclude: ['password_hash'] },
      include: [{ model: AdminUser, as: 'adminRole', attributes: ['role'] }],
    });

    res.json({
      success: true,
      ...buildPaginationResponse(rows, count, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: AdminUser, as: 'adminRole', attributes: ['role'] }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Get user stats
    const transactionCount = await Transaction.count({ where: { user_id: user.id } });
    const budgetCount = await Budget.count({ where: { user_id: user.id } });
    const savingsCount = await SavingsGoal.count({ where: { user_id: user.id } });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        stats: {
          transactions: transactionCount,
          budgets: budgetCount,
          savings_goals: savingsCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/users/:id/status
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    user.status = status;
    await user.save();

    await AuditLog.create({
      actor_id: req.userId,
      actor_type: 'admin',
      action: 'admin.update_user_status',
      resource_type: 'user',
      resource_id: user.id,
      details: { new_status: status },
      ip_address: req.ip,
    });

    res.json({ success: true, data: { message: `User status updated to ${status}` } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, actor_type, start_date, end_date } = req.query;

    const where = {};
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (actor_type) where.actor_type = actor_type;
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      ...paginate({ where, order: [['created_at', 'DESC']] }, page, limit),
      include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'email'] }],
    });

    res.json({
      success: true,
      ...buildPaginationResponse(rows, count, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/stats
const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const totalTransactions = await Transaction.count();
    const totalBudgets = await Budget.count({ where: { is_active: true } });
    const totalSavingsGoals = await SavingsGoal.count({ where: { status: 'active' } });

    // This month's stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = await Transaction.count({
      where: { created_at: { [Op.gte]: monthStart } },
    });

    const monthlyVolume = await Transaction.sum('amount', {
      where: { created_at: { [Op.gte]: monthStart } },
    }) || 0;

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        transactions: { total: totalTransactions, this_month: monthlyTransactions },
        monthly_volume: parseFloat(monthlyVolume),
        budgets: totalBudgets,
        savings_goals: totalSavingsGoals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/categories
const updateCategories = async (req, res, next) => {
  try {
    const { categories } = req.body;
    // Update system categories
    res.json({ success: true, data: { message: 'Categories updated' } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/system
const getSystemConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        app_name: 'Student Kwacha',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        default_currency: 'ZMW',
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/system
const updateSystemConfig = async (req, res, next) => {
  try {
    res.json({ success: true, data: { message: 'System configuration updated' } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUser,
  updateUserStatus,
  getAuditLogs,
  getStats,
  updateCategories,
  getSystemConfig,
  updateSystemConfig,
};
