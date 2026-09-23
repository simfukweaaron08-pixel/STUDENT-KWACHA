const { Transaction, Category, Budget, SavingsGoal, SavingsEntry } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

// GET /api/v1/analytics/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Monthly income and expenses
    const transactions = await Transaction.findAll({
      where: {
        user_id: userId,
        transaction_date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      const amt = parseFloat(t.amount);
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') totalExpenses += amt;
    });

    // Active budgets
    const budgets = await Budget.findAll({
      where: { user_id: userId, is_active: true },
    });

    let totalBudget = 0;
    let totalSpent = 0;
    for (const budget of budgets) {
      totalBudget += parseFloat(budget.amount);
      const spent = await Transaction.sum('amount', {
        where: {
          user_id: userId,
          type: 'expense',
          transaction_date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
          ...(budget.category_id ? { category_id: budget.category_id } : {}),
        },
      }) || 0;
      totalSpent += parseFloat(spent);
    }

    // Savings goals
    const savingsGoals = await SavingsGoal.findAll({
      where: { user_id: userId, status: 'active' },
    });
    const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0);
    const totalSaved = savingsGoals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);

    // Top spending categories
    const categoryBreakdown = await Transaction.findAll({
      attributes: [
        'category_id',
        [fn('SUM', col('amount')), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'expense',
        transaction_date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      },
      group: ['category_id', 'category.id', 'category.name', 'category.icon', 'category.color'],
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }],
      order: [[literal('total'), 'DESC']],
      limit: 5,
    });

    // Recent transactions
    const recentTransactions = await Transaction.findAll({
      where: { user_id: userId },
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }],
      order: [['transaction_date', 'DESC']],
      limit: 5,
    });

    res.json({
      success: true,
      data: {
        monthly_summary: {
          income: totalIncome,
          expenses: totalExpenses,
          net: totalIncome - totalExpenses,
        },
        budgets: {
          total_budget: totalBudget,
          total_spent: totalSpent,
          remaining: totalBudget - totalSpent,
        },
        savings: {
          total_target: totalSavingsTarget,
          total_saved: totalSaved,
          progress: totalSavingsTarget > 0 ? (totalSaved / totalSavingsTarget) * 100 : 0,
        },
        top_categories: categoryBreakdown,
        recent_transactions: recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/monthly-comparison
const getMonthlyComparison = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.userId;
    const now = new Date();
    const results = [];

    for (let i = 0; i < months; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const income = await Transaction.sum('amount', {
        where: { user_id: userId, type: 'income', transaction_date: { [Op.gte]: start, [Op.lte]: end } },
      }) || 0;

      const expenses = await Transaction.sum('amount', {
        where: { user_id: userId, type: 'expense', transaction_date: { [Op.gte]: start, [Op.lte]: end } },
      }) || 0;

      results.unshift({
        month: start.toISOString().slice(0, 7),
        income: parseFloat(income),
        expenses: parseFloat(expenses),
        net: parseFloat(income) - parseFloat(expenses),
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/category-breakdown
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { start_date, end_date, type = 'expense' } = req.query;
    const userId = req.userId;

    const where = { user_id: userId, type };
    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date[Op.gte] = new Date(start_date);
      if (end_date) where.transaction_date[Op.lte] = new Date(end_date);
    } else {
      // Default: current month
      const now = new Date();
      where.transaction_date = {
        [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
        [Op.lte]: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }

    const breakdown = await Transaction.findAll({
      attributes: [
        'category_id',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('Transaction.id')), 'count'],
      ],
      where,
      group: ['category_id', 'category.id', 'category.name', 'category.icon', 'category.color'],
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }],
      order: [[literal('total'), 'DESC']],
    });

    const grandTotal = breakdown.reduce((sum, b) => sum + parseFloat(b.dataValues.total), 0);

    const result = breakdown.map((b) => ({
      category: b.category,
      total: parseFloat(b.dataValues.total),
      count: parseInt(b.dataValues.count),
      percentage: grandTotal > 0 ? (parseFloat(b.dataValues.total) / grandTotal) * 100 : 0,
    }));

    res.json({ success: true, data: { total: grandTotal, categories: result } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/trends
const getSpendingTrends = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const userId = req.userId;
    const now = new Date();
    const results = [];

    for (let i = 0; i < months; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const expenses = await Transaction.sum('amount', {
        where: { user_id: userId, type: 'expense', transaction_date: { [Op.gte]: start, [Op.lte]: end } },
      }) || 0;

      results.unshift({
        month: start.toISOString().slice(0, 7),
        expenses: parseFloat(expenses),
      });
    }

    // Calculate trend
    const recent = results.slice(-3);
    const older = results.slice(0, 3);
    const recentAvg = recent.reduce((s, r) => s + r.expenses, 0) / recent.length;
    const olderAvg = older.reduce((s, r) => s + r.expenses, 0) / older.length;
    const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    res.json({
      success: true,
      data: {
        trends: results,
        trend_percentage: trend,
        trend_direction: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/savings-trends
const getSavingsTrends = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.userId;
    const now = new Date();

    const goals = await SavingsGoal.findAll({ where: { user_id: userId } });
    const goalIds = goals.map((g) => g.id);

    const results = [];
    for (let i = 0; i < months; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const entries = await SavingsEntry.findAll({
        where: {
          savings_goal_id: goalIds,
          entry_date: { [Op.gte]: start, [Op.lte]: end },
        },
      });

      const saved = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      results.unshift({
        month: start.toISOString().slice(0, 7),
        saved,
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getMonthlyComparison,
  getCategoryBreakdown,
  getSpendingTrends,
  getSavingsTrends,
};
