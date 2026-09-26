const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBudgetSchema, updateBudgetSchema } = require('../validators/budgets');
const {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSpending,
  getBudgetAlerts,
  getBudgetPrediction,
  getFundingStatus,
  activateBudget,
  retryBudgetFunding,
} = require('../controllers/budgets');

router.use(authenticate);

// Static routes must come before /:id
router.get('/alerts', getBudgetAlerts);
router.get('/prediction', getBudgetPrediction);
router.get('/funding-status', getFundingStatus);

router.get('/', listBudgets);
router.get('/:id', getBudget);
router.post('/', validate(createBudgetSchema), createBudget);
router.post('/:id/activate', activateBudget);
router.post('/:id/retry-funding', retryBudgetFunding);
router.put('/:id', validate(updateBudgetSchema), updateBudget);
router.delete('/:id', deleteBudget);
router.get('/:id/spending', getBudgetSpending);

module.exports = router;
