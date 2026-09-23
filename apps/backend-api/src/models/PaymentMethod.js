const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * A payment method linked by a student.
 *
 * Card-only by default: the card is vaulted with PayPal (the processor) and
 * we store ONLY the vault token + display fields (brand, last4, expiry).
 * Full card numbers and CVVs are never stored or logged by Student Kwacha.
 *
 * PayPal-account linking is still supported for users who prefer it, but the
 * app onboards students through card linking — no PayPal account required.
 */
const PaymentMethod = sequelize.define('PaymentMethod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  // Payment processor that vaults and charges the card
  provider: {
    type: DataTypes.ENUM('paypal'),
    defaultValue: 'paypal',
  },
  // 'card' (default) or 'paypal_account'
  method_type: {
    type: DataTypes.ENUM('card', 'paypal_account'),
    defaultValue: 'card',
  },
  // ── Card (vaulted at PayPal) ──
  // Token returned by the PayPal Vault — this is what charges reference
  vault_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  card_brand: {
    type: DataTypes.STRING(30),
    allowNull: true, // Visa, Mastercard, …
  },
  card_last4: {
    type: DataTypes.STRING(4),
    allowNull: true,
  },
  exp_month: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 12 },
  },
  exp_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cardholder_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  // ── PayPal account (optional alternative) ──
  payer_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  paypal_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  // Display description of the funding source (e.g. "Visa •• 4242")
  funding_source_description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'disconnected'),
    defaultValue: 'active',
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_charged_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_charge_failed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  consecutive_failures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'payment_methods',
  hooks: {
    // Only one default payment method per user
    async beforeUpdate(pm) {
      if (pm.changed('is_default') && pm.is_default) {
        await PaymentMethod.update(
          { is_default: false },
          { where: { user_id: pm.user_id, id: { [Op.ne]: pm.id } } }
        );
      }
    },
  },
});

module.exports = PaymentMethod;
