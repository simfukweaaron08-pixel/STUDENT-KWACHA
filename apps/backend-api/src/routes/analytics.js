const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDashboard,
  getMonthlyComparison,
  getCategoryBreakdown,
  getSpendingTrends,
  getSavingsTrends,
} = require('../controllers/analytics');

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/monthly-comparison', getMonthlyComparison);
router.get('/category-breakdown', getCategoryBreakdown);
router.get('/trends', getSpendingTrends);
router.get('/savings-trends', getSavingsTrends);

module.exports = router;
