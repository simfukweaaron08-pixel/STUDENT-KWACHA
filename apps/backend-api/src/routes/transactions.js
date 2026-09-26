const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTransactionSchema,
  updateTransactionSchema,
  updateCategorySchema,
} = require('../validators/transactions');
const {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updateTransactionCategory,
  getTransactionSummary,
} = require('../controllers/transactions');

router.use(authenticate);

// Summary must come before /:id to avoid conflict
router.get('/summary', getTransactionSummary);

router.get('/', listTransactions);
router.get('/:id', getTransaction);
router.post('/', validate(createTransactionSchema), createTransaction);
router.put('/:id', validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);
router.put('/:id/category', validate(updateCategorySchema), updateTransactionCategory);

module.exports = router;
