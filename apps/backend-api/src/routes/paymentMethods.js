const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { linkCardSchema } = require('../validators/paymentMethods');
const {
  getOnboardingStatus,
  listPaymentMethods,
  linkCard,
  setDefault,
  disconnectPaymentMethod,
} = require('../controllers/paymentMethods');

// Sensitive endpoint — stricter rate limiting
const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many card-link attempts, please try again later.' } },
});

router.use(authenticate);

// Static routes must come before /:id
router.get('/onboarding-status', getOnboardingStatus);
router.get('/', listPaymentMethods);
router.post('/link-card', linkLimiter, validate(linkCardSchema), linkCard);
router.put('/:id/default', setDefault);
router.delete('/:id', disconnectPaymentMethod);

module.exports = router;
