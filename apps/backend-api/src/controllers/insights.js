const { FinancialInsight, Transaction, Category } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// GET /api/v1/insights
const listInsights = async (req, res, next) => {
  try {
    const insights = await FinancialInsight.findAll({
      where: { user_id: req.userId },
      order: [['generated_at', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, data: insights });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/insights/:id/read
const markInsightRead = async (req, res, next) => {
  try {
    const insight = await FinancialInsight.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Insight not found' },
      });
    }

    insight.is_read = true;
    await insight.save();
    res.json({ success: true, data: insight });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/insights/tips
const getPersonalizedTips = async (req, res, next) => {
  try {
    const userId = req.userId;
    const tips = [];

    // Analyze spending patterns
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month spending by category
    const currentMonthSpending = await Transaction.findAll({
      attributes: [
        'category_id',
        [fn('SUM', col('amount')), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'expense',
        transaction_date: { [Op.gte]: monthStart },
      },
      group: ['category_id', 'category.id', 'category.name'],
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
    });

    // Last month spending
    const lastMonthSpending = await Transaction.findAll({
      attributes: [
        'category_id',
        [fn('SUM', col('amount')), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'expense',
        transaction_date: { [Op.gte]: lastMonthStart, [Op.lte]: lastMonthEnd },
      },
      group: ['category_id'],
    });

    // Generate tips based on patterns
    const totalCurrentMonth = currentMonthSpending.reduce((s, c) => s + parseFloat(c.dataValues.total), 0);
    const totalLastMonth = lastMonthSpending.reduce((s, c) => s + parseFloat(c.dataValues.total), 0);

    // Spending increase tip
    if (totalLastMonth > 0 && totalCurrentMonth > totalLastMonth * 1.2) {
      tips.push({
        type: 'spending_tip',
        title: 'Spending Increase Detected',
        body: `Your spending this month (K${totalCurrentMonth.toFixed(2)}) is ${( ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100).toFixed(0)}% higher than last month. Consider reviewing your expenses to stay within budget.`,
        priority: 'high',
      });
    }

    // Top spending category
    if (currentMonthSpending.length > 0) {
      const topCategory = currentMonthSpending.reduce((max, c) =>
        parseFloat(c.dataValues.total) > parseFloat(max.dataValues.total) ? c : max
      );
      const topName = topCategory.category?.name || 'Unknown';
      tips.push({
        type: 'category_insight',
        title: `Highest Spending: ${topName}`,
        body: `You've spent K${parseFloat(topCategory.dataValues.total).toFixed(2)} on ${topName} this month. This is your largest expense category.`,
        priority: 'medium',
      });
    }

    // Savings tip
    const totalIncome = await Transaction.sum('amount', {
      where: { user_id: userId, type: 'income', transaction_date: { [Op.gte]: monthStart } },
    }) || 0;

    if (parseFloat(totalIncome) > 0) {
      const savingsRate = ((parseFloat(totalIncome) - totalCurrentMonth) / parseFloat(totalIncome)) * 100;
      if (savingsRate < 20) {
        tips.push({
          type: 'savings_tip',
          title: 'Low Savings Rate',
          body: `Your current savings rate is ${savingsRate.toFixed(0)}%. Financial experts recommend saving at least 20% of your income. Consider reducing non-essential expenses.`,
          priority: 'medium',
        });
      } else {
        tips.push({
          type: 'savings_tip',
          title: 'Good Savings Rate',
          body: `Great job! Your savings rate is ${savingsRate.toFixed(0)}%. Keep up the good financial habits.`,
          priority: 'low',
        });
      }
    }

    // Budget tip
    const { Budget } = require('../models');
    const activeBudgets = await Budget.findAll({
      where: { user_id: userId, is_active: true },
    });

    for (const budget of activeBudgets) {
      const spent = await Transaction.sum('amount', {
        where: {
          user_id: userId,
          type: 'expense',
          transaction_date: { [Op.gte]: monthStart },
          ...(budget.category_id ? { category_id: budget.category_id } : {}),
        },
      }) || 0;

      const percentage = (parseFloat(spent) / parseFloat(budget.amount)) * 100;
      if (percentage >= 90) {
        tips.push({
          type: 'budget_tip',
          title: `Budget Alert: ${percentage.toFixed(0)}% Used`,
          body: `You've used ${percentage.toFixed(0)}% of your budget. Try to limit spending for the rest of the month.`,
          priority: 'high',
        });
      }
    }

    // Disclaimer
    tips.push({
      type: 'general',
      title: 'Disclaimer',
      body: 'These insights are generated automatically and are for informational purposes only. They should not be considered professional financial advice.',
      priority: 'low',
    });

    res.json({ success: true, data: tips });
  } catch (error) {
    next(error);
  }
};

module.exports = { listInsights, markInsightRead, getPersonalizedTips };
