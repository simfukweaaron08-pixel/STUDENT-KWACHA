const { SavingsGoal, SavingsEntry, Transaction } = require('../models');
const { Op } = require('sequelize');

// GET /api/v1/savings
const listSavingsGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.findAll({
      where: { user_id: req.userId },
      include: [{ model: SavingsEntry, as: 'entries', attributes: ['id', 'amount', 'entry_date'] }],
      order: [['created_at', 'DESC']],
    });

    const results = goals.map((goal) => ({
      ...goal.toJSON(),
      progress_percentage: goal.target_amount > 0
        ? (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100
        : 0,
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/savings/:id
const getSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: SavingsEntry, as: 'entries', order: [['entry_date', 'DESC']] }],
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Savings goal not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...goal.toJSON(),
        progress_percentage: goal.target_amount > 0
          ? (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100
          : 0,
        remaining: parseFloat(goal.target_amount) - parseFloat(goal.current_amount),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/savings
const createSavingsGoal = async (req, res, next) => {
  try {
    const { name, target_amount, target_date, frequency } = req.validated.body;

    const goal = await SavingsGoal.create({
      user_id: req.userId,
      name,
      target_amount,
      target_date,
      frequency,
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/savings/:id
const updateSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Savings goal not found' },
      });
    }

    const updates = req.validated.body;
    if (updates.name) goal.name = updates.name;
    if (updates.target_amount) goal.target_amount = updates.target_amount;
    if (updates.target_date) goal.target_date = updates.target_date;
    if (updates.frequency) goal.frequency = updates.frequency;
    if (updates.status) goal.status = updates.status;

    await goal.save();
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/savings/:id
const deleteSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Savings goal not found' },
      });
    }

    await goal.destroy();
    res.json({ success: true, data: { message: 'Savings goal deleted' } });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/savings/:id/entries
const addSavingsEntry = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Savings goal not found' },
      });
    }

    if (goal.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'GOAL_NOT_ACTIVE', message: 'Cannot add entries to inactive goals' },
      });
    }

    const { amount, entry_date } = req.validated.body;

    const entry = await SavingsEntry.create({
      savings_goal_id: goal.id,
      amount,
      entry_date,
    });

    // Update current_amount
    goal.current_amount = parseFloat(goal.current_amount) + amount;
    if (parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)) {
      goal.status = 'completed';
    }
    await goal.save();

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/savings/:id/predictions
const getSavingsPrediction = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Savings goal not found' },
      });
    }

    const entries = await SavingsEntry.findAll({
      where: { savings_goal_id: goal.id },
      order: [['entry_date', 'ASC']],
    });

    if (entries.length < 3) {
      return res.json({
        success: true,
        data: {
          prediction_available: false,
          message: 'Not enough data for prediction. Continue tracking to enable insights.',
          entries_count: entries.length,
          minimum_required: 3,
        },
      });
    }

    // Try calling ML service for prediction
    try {
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      const mlResponse = await fetch(`${mlUrl}/ml/v1/predictions/savings/${req.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goal.id,
          target_amount: parseFloat(goal.target_amount),
          current_amount: parseFloat(goal.current_amount),
          target_date: goal.target_date,
          entries: entries.map((e) => ({ amount: parseFloat(e.amount), date: e.entry_date })),
        }),
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        return res.json({ success: true, data: mlData });
      }
    } catch {
      // ML service unavailable; fall back to simple prediction
    }

    // Simple fallback prediction
    const amounts = entries.map((e) => parseFloat(e.amount));
    const avgMonthly = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount);
    const monthsNeeded = Math.ceil(remaining / avgMonthly);

    res.json({
      success: true,
      data: {
        prediction_available: true,
        predicted_monthly_savings: avgMonthly,
        months_remaining: monthsNeeded,
        estimated_completion: new Date(Date.now() + monthsNeeded * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 'low',
        message: 'Basic prediction based on average savings. For better predictions, continue tracking.',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addSavingsEntry,
  getSavingsPrediction,
};
