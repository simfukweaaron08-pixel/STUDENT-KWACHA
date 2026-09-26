const { PaymentMethod, Budget, sequelize } = require('../models');
const paypal = require('../services/paypal');

/**
 * GET /api/v1/payment-methods/onboarding-status
 *
 * Drives the client onboarding gate: a student must link a card before
 * using the app (new users are routed into onboarding; existing users get a
 * prompt until they link).
 */
const getOnboardingStatus = async (req, res, next) => {
  try {
    const activeMethod = await PaymentMethod.findOne({
      where: { user_id: req.userId, status: 'active' },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        payment_method_connected: Boolean(activeMethod),
        payment_method: activeMethod ? activeMethod.toJSON() : null,
        payment_mode: paypal.getPaymentMode(), // 'sandbox' | 'simulated' | 'live'
        provider: 'paypal', // card processor
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/payment-methods
 * List the student's linked cards (safe display fields only).
 */
const listPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.findAll({
      where: { user_id: req.userId },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: methods.map((pm) => ({
        id: pm.id,
        method_type: pm.method_type,
        card_brand: pm.card_brand,
        card_last4: pm.card_last4,
        exp_month: pm.exp_month,
        exp_year: pm.exp_year,
        cardholder_name: pm.cardholder_name,
        funding_source_description: pm.funding_source_description,
        status: pm.status,
        is_default: pm.is_default,
        last_charged_at: pm.last_charged_at,
        provider_mode: paypal.getPaymentMode(),
        created_at: pm.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payment-methods/link-card
 *
 * Link a card (no PayPal account needed). The card is vaulted with PayPal —
 * our database stores only the vault token, brand, last4 and expiry.
 * Raw card numbers/CVVs are never persisted or logged.
 *
 * Body: { card_number, exp_month, exp_year, cvv, cardholder_name }
 */
const linkCard = async (req, res, next) => {
  try {
    const { card_number, exp_month, exp_year, cvv, cardholder_name } = req.validated.body;

    // Pre-validate before hitting the processor
    if (!paypal.isValidCardNumber(card_number)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CARD', message: 'Card number is not valid' },
      });
    }

    const expiry = new Date(exp_year, exp_month, 1); // first day after expiry month
    if (expiry <= new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'CARD_EXPIRED', message: 'This card has expired' },
      });
    }

    // Vault the card with PayPal (or simulated vault without credentials)
    let vault;
    try {
      vault = await paypal.vaultCard({ cardNumber: card_number, expMonth: exp_month, expYear: exp_year, cardholderName: cardholder_name, cvv });
    } catch (vaultError) {
      const isClientError = (vaultError.statusCode || 0) < 500;
      return res.status(vaultError.statusCode || 502).json({
        success: false,
        error: {
          code: vaultError.code || 'CARD_VAULTING_FAILED',
          message: isClientError
            ? vaultError.message || 'The card could not be saved. Check the details and try again.'
            : 'Card processor is unavailable. Try again shortly.',
        },
      });
    }

    // First linked method becomes the default
    const activeCount = await PaymentMethod.count({ where: { user_id: req.userId, status: 'active' } });

    const pm = await PaymentMethod.create({
      user_id: req.userId,
      provider: 'paypal',
      method_type: 'card',
      vault_token: vault.vaultToken,
      card_brand: vault.brand,
      card_last4: vault.last4,
      exp_month: vault.expMonth,
      exp_year: vault.expYear,
      cardholder_name: cardholder_name || null,
      funding_source_description: `${vault.brand} •• ${vault.last4}`,
      status: 'active',
      is_default: activeCount === 0,
    });

    res.status(201).json({
      success: true,
      data: {
        id: pm.id,
        method_type: pm.method_type,
        card_brand: pm.card_brand,
        card_last4: pm.card_last4,
        exp_month: pm.exp_month,
        exp_year: pm.exp_year,
        funding_source_description: pm.funding_source_description,
        status: pm.status,
        is_default: pm.is_default,
        provider_mode: vault.mode,
        message: vault.mode === 'simulated'
          ? 'Card linked in demo mode (no PAYPAL_CLIENT_ID configured — no real charges will be made).'
          : 'Card linked securely via PayPal (sandbox).',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/payment-methods/:id/default
 */
const setDefault = async (req, res, next) => {
  try {
    const pm = await PaymentMethod.findOne({
      where: { id: req.params.id, user_id: req.userId, status: 'active' },
    });

    if (!pm) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment method not found' },
      });
    }

    await sequelize.transaction(async (t) => {
      await PaymentMethod.update(
        { is_default: false },
        { where: { user_id: req.userId }, transaction: t }
      );
      pm.is_default = true;
      await pm.save({ transaction: t });
    });

    res.json({ success: true, data: pm });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/payment-methods/:id
 * Unlink the card. Auto-funded budgets using it will fail funding with
 * NO_PAYMENT_METHOD until another card is linked.
 */
const disconnectPaymentMethod = async (req, res, next) => {
  try {
    const pm = await PaymentMethod.findOne({
      where: { id: req.params.id, user_id: req.userId, status: 'active' },
    });

    if (!pm) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment method not found' },
      });
    }

    pm.status = 'disconnected';
    pm.is_default = false;
    await pm.save();

    // Point affected budgets at any other active card, if one exists
    const fallback = await PaymentMethod.findOne({
      where: { user_id: req.userId, status: 'active' },
      order: [['is_default', 'DESC']],
    });
    if (fallback) {
      await Budget.update(
        { payment_method_id: fallback.id },
        { where: { user_id: req.userId, payment_method_id: pm.id } }
      );
    }

    res.json({ success: true, data: { message: 'Card unlinked' } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOnboardingStatus,
  listPaymentMethods,
  linkCard,
  setDefault,
  disconnectPaymentMethod,
};
