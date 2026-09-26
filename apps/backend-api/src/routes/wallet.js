const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  paySchema,
  limitsSchema,
} = require('../validators/wallet');
const {
  getWallet,
  listWalletTransactions,
  payFromWallet,
  updateLimits,
} = require('../controllers/wallet');

const router = express.Router();

// Stricter rate limiting on payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many payment requests, please try again later.' } },
});

// All wallet routes require authentication
router.use(authenticate);

router.get('/', getWallet);
router.post('/pay', paymentLimiter, validate(paySchema), payFromWallet);
router.get('/transactions', listWalletTransactions);
router.put('/limits', validate(limitsSchema), updateLimits);

module.exports = router;
