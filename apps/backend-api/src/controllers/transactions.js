const { Transaction, Category, User } = require('../models');
const { paginate, buildPaginationResponse, Op } = require('../utils/pagination');
const { checkSpendingControls, evaluateBudgetAlerts } = require('../services/budgetAlerts');

// GET /api/v1/transactions
const listTransactions = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20,
      start_date, end_date, category_id,
      type, source, min_amount, max_amount, search,
    } = req.query;

    const where = { user_id: req.userId };

    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date[Op.gte] = new Date(start_date);
      if (end_date) where.transaction_date[Op.lte] = new Date(end_date);
    }
    if (category_id) where.category_id = category_id;
    if (type) where.type = type;
    if (source) where.source = source;
    if (min_amount || max_amount) {
      where.amount = {};
      if (min_amount) where.amount[Op.gte] = min_amount;
      if (max_amount) where.amount[Op.lte] = max_amount;
    }
    if (search) {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { reference_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Transaction.findAndCountAll({
      ...paginate({ where, order: [['transaction_date', 'DESC']] }, page, limit),
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    res.json({
      success: true,
      ...buildPaginationResponse(rows, count, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/transactions/summary
const getTransactionSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const where = { user_id: req.userId };

    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date[Op.gte] = new Date(start_date);
      if (end_date) where.transaction_date[Op.lte] = new Date(end_date);
    }

    const transactions = await Transaction.findAll({ where });

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    transactions.forEach((t) => {
      const amt = parseFloat(t.amount);
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') totalExpenses += amt;
      else totalTransfers += amt;
    });

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_transfers: totalTransfers,
        net: totalIncome - totalExpenses,
        transaction_count: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/transactions/:id
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/transactions
const createTransaction = async (req, res, next) => {
  try {
    const {
      amount, type, description, category_id,
      source, reference_number, transaction_date,
      is_recurring, tags,
    } = req.validated.body;

    // ── Spending control: block expenses that would exceed a strict (enforced) budget ──
    if (type === 'expense') {
      const controls = await checkSpendingControls(req.userId, { amount, categoryId: category_id });
      if (!controls.allowed) {
        const blocked = controls.blockedBy[0];
        await evaluateBudgetAlerts(req.userId);
        return res.status(403).json({
          success: false,
          error: {
            code: 'BUDGET_LIMIT_EXCEEDED',
            message: `Transaction blocked: would exceed your ${blocked.name} budget of K${blocked.limit.toFixed(2)} by K${blocked.wouldExceedBy.toFixed(2)}.`,
            details: controls.blockedBy,
          },
        });
      }
    }

    // If no category provided, try auto-categorization via ML service
    let finalCategoryId = category_id;
    let categorySource = category_id ? 'manual' : 'auto';

    if (!finalCategoryId) {
      try {
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        const mlResponse = await fetch(`${mlUrl}/ml/v1/categorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, amount, source }),
        });
        if (mlResponse.ok) {
          const mlData = await mlResponse.json();
          if (mlData.confidence > 0.5) {
            finalCategoryId = mlData.category_id;
          }
        }
      } catch {
        // ML service unavailable; proceed without auto-categorization
      }
    }

    // Fallback: assign 'Other' category if still no category
    if (!finalCategoryId) {
      const otherCategory = await Category.findOne({ where: { name: 'Other' } });
      if (otherCategory) finalCategoryId = otherCategory.id;
    }

    const transaction = await Transaction.create({
      user_id: req.userId,
      amount,
      type,
      description,
      category_id: finalCategoryId,
      category_source: categorySource,
      source,
      reference_number,
      transaction_date: new Date(transaction_date),
      is_recurring: is_recurring || false,
      tags: tags || [],
    });

    // Include category in response
    const result = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    // Evaluate budget thresholds in the background (non-blocking response)
    if (type === 'expense') {
      evaluateBudgetAlerts(req.userId).catch(() => {});
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/transactions/:id
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
    }

    const updates = req.validated.body;
    if (updates.amount !== undefined) transaction.amount = updates.amount;
    if (updates.type) transaction.type = updates.type;
    if (updates.description !== undefined) transaction.description = updates.description;
    if (updates.category_id) transaction.category_id = updates.category_id;
    if (updates.source !== undefined) transaction.source = updates.source;
    if (updates.is_recurring !== undefined) transaction.is_recurring = updates.is_recurring;
    if (updates.tags) transaction.tags = updates.tags;

    await transaction.save();

    const result = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
    }

    await transaction.destroy();
    res.json({ success: true, data: { message: 'Transaction deleted' } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/transactions/:id/category
const updateTransactionCategory = async (req, res, next) => {
  try {
    const { category_id, category_source } = req.validated.body;
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
    }

    transaction.category_id = category_id;
    if (category_source) transaction.category_source = category_source;
    else transaction.category_source = 'manual';
    await transaction.save();

    const result = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updateTransactionCategory,
  getTransactionSummary,
};
