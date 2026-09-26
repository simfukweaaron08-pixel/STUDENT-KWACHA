/**
 * PayPal payment service (card-first, hold-then-capture)
 *
 * Students link a **card** (Visa/Mastercard — no PayPal account needed).
 * The card is vaulted with PayPal, which acts purely as the payment
 * processor. Money moves in two steps:
 *
 *   1. FUNDING  — on a budget's funding date we **authorize** (hold) the
 *                 budget amount on the card. No money leaves the student's
 *                 account yet; the card issuer reserves the funds.
 *   2. SPENDING — every budget-item payment **captures** its amount from
 *                 the hold. Each capture is a real card transaction that
 *                 appears on the PayPal dashboard and the student's card
 *                 statement, tied to the budget it came from.
 *   3. SWEEP    — when a funding cycle ends, any unspent hold balance is
 *                 voided (released back to the card) or captured as
 *                 configured before the authorization expires.
 *
 * Modes:
 *   - 'sandbox'   — PayPal Sandbox REST API (PAYPAL_CLIENT_ID + PAYPAL_SECRET
 *                   set; PAYPAL_BASE_URL defaults to the sandbox host)
 *   - 'simulated' — no credentials; holds/captures are clearly-labelled
 *                   simulations so the flow is demoable without credentials
 *   - 'live'      — production base URL + credentials
 *
 * Demo triggers in simulated mode: amounts with .13 (declined) or .99
 * (insufficient funds) cents force failures so the failure → notify → retry
 * flow can be demonstrated.
 *
 * NOTE on endpoints: the classic v1 Payments + Vault APIs are used because
 * they work on standard PayPal merchant/sandbox accounts. v3 Vault and the
 * Orders v2 card flows require "Advanced Credit and Debit Card Payments"
 * enablement on the REST app; when that is enabled the calls here can be
 * swapped without changing the hold/capture model.
 */

const crypto = require('crypto');
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';

// Card authorizations (holds) expire after ~3 days (issuer honor period is
// 3-7 days). The scheduler sweeps holds before this window closes.
const HOLD_VALIDITY_DAYS = 3;

// PayPal does not process ZMW — set PAYPAL_CURRENCY=USD (or another
// supported code) in .env when credentials are configured.
const CHARGE_CURRENCY = process.env.PAYPAL_CURRENCY || 'ZMW';

function getPaymentMode() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return 'simulated';
  return PAYPAL_BASE_URL.includes('sandbox') ? 'sandbox' : 'live';
}

const isLiveMode = () => getPaymentMode() !== 'simulated';

/**
 * Pull a human-readable message out of a PayPal error payload.
 * Handles both { message } and { details: [{ issue, description }] } shapes.
 */
function extractProviderError(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;
  const detail = Array.isArray(data.details) && data.details[0];
  const issue = detail?.issue || detail?.description;
  if (
    issue === 'PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING' ||
    data.name === 'PAYEE_ACCOUNT_INVALID' ||
    issue === 'PAYEE_ACCOUNT_INVALID'
  ) {
    return 'Card processing is not enabled for the merchant account. In the PayPal developer dashboard, create a Business (Pro) sandbox account and associate this REST app with it.';
  }
  return data.message || issue || data.name || fallback;
}

/** OAuth2 access token for the PayPal REST API (cached until near-expiry). */
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const err = new Error(data.error_description || 'PayPal authentication failed');
    err.statusCode = 502;
    err.code = 'PAYMENT_PROVIDER_ERROR';
    throw err;
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/** Basic card brand detection from the IIN. */
function detectCardBrand(cardNumber) {
  const n = String(cardNumber).replace(/\s+/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  return 'Card';
}

/** Luhn check — validates card numbers client-side before vaulting. */
function isValidCardNumber(cardNumber) {
  const n = String(cardNumber).replace(/\D/g, '');
  if (n.length < 12 || n.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Vault a card so it can be charged later without storing card details.
 *
 * `POST /v1/vault/credit-cards` with the card details (the raw PAN is sent
 * once over TLS to PayPal and never persisted by this app).
 *
 * @returns {Promise<{mode, vaultToken, brand, last4, expMonth, expYear}>}
 */
async function vaultCard({ cardNumber, expMonth, expYear, cardholderName, cvv }) {
  const brand = detectCardBrand(cardNumber);
  const last4 = String(cardNumber).replace(/\D/g, '').slice(-4);

  if (!isLiveMode()) {
    // ── Simulated vault ──
    const token = `SIMVAULT-${crypto
      .createHash('sha256')
      .update(`${last4}:${expMonth}/${expYear}:${Date.now()}`)
      .digest('hex')
      .slice(0, 20)
      .toUpperCase()}`;
    return { mode: 'simulated', vaultToken: token, brand, last4, expMonth, expYear };
  }

  const token = await getAccessToken();
  const nameParts = String(cardholderName || 'Card Holder').trim().split(/\s+/);
  const brandMap = { Visa: 'visa', Mastercard: 'mastercard', Amex: 'amex', Discover: 'discover' };
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/vault/credit-cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: String(cardNumber).replace(/\D/g, ''),
      type: brandMap[brand] || 'visa',
      expire_month: expMonth,
      expire_year: expYear,
      cvv2: String(cvv || ''),
      first_name: nameParts[0] || 'Card',
      last_name: nameParts.slice(1).join(' ') || 'Holder',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    const err = new Error(extractProviderError(data, 'Card could not be saved'));
    err.code = 'CARD_VAULTING_FAILED';
    err.statusCode = response.status || 400;
    throw err;
  }

  return {
    mode: getPaymentMode(),
    vaultToken: data.id,
    brand: data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : brand,
    last4: data.number ? String(data.number).slice(-4) : last4,
    expMonth: data.expire_month || expMonth,
    expYear: data.expire_year || expYear,
  };
}

/**
 * Place a HOLD (authorization) on the card for a budget funding cycle.
 *
 * No money leaves the cardholder's account — the issuer reserves the amount
 * for ~3 days. Each budget-item payment then captures its portion from the
 * hold (see captureFromHold), and leftover balance is voided when the cycle
 * ends. Every capture is a real card transaction on the PayPal dashboard.
 *
 * @param {object} params
 * @param {number} params.amount
 * @param {string} params.vaultToken - PayPal vault token of the card
 * @param {string} params.reference  - unique reference for this hold
 * @param {string} params.description
 * @returns {Promise<{mode, status: 'completed'|'failed', holdId?, providerReference?, failureReason?, expiresAt?}>}
 */
async function authorizeHold({ amount, vaultToken, reference, description }) {
  if (!isLiveMode()) {
    const cents = Math.round((amount - Math.floor(amount)) * 100);
    if (cents === 13) {
      return {
        mode: 'simulated',
        status: 'failed',
        failureReason: 'CARD_DECLINED (simulated failure — demo trigger .13)',
      };
    }
    if (cents === 99) {
      return {
        mode: 'simulated',
        status: 'failed',
        failureReason: 'INSUFFICIENT_FUNDS (simulated failure — demo trigger .99)',
      };
    }
    return {
      mode: 'simulated',
      status: 'completed',
      holdId: `SIMAUTH-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      providerReference: `sim:${reference}`,
      expiresAt: new Date(Date.now() + HOLD_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      failureReason: null,
    };
  }

  // ── Sandbox / live: v1 authorization against the vaulted card ──
  try {
    const token = await getAccessToken();
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'authorize',
        payer: {
          payment_method: 'credit_card',
          funding_instruments: [{ credit_card_token: { credit_card_id: vaultToken } }],
        },
        transactions: [
          {
            amount: { total: amount.toFixed(2), currency: CHARGE_CURRENCY },
            description: (description || 'Budget funding hold').slice(0, 127),
            invoice_number: reference.slice(0, 127),
          },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    const authz = data.transactions?.[0]?.related_resources?.[0]?.authorization;

    if (!response.ok || !authz?.id) {
      return {
        mode: getPaymentMode(),
        status: 'failed',
        failureReason: extractProviderError(data, 'CARD_COULD_NOT_BE_AUTHORIZED'),
      };
    }

    return {
      mode: getPaymentMode(),
      status: 'completed',
      holdId: authz.id,
      providerReference: data.id,
      expiresAt: authz.valid_until || null,
      failureReason: null,
    };
  } catch (error) {
    return {
      mode: getPaymentMode(),
      status: 'failed',
      failureReason: error.message || 'PAYMENT_PROVIDER_UNAVAILABLE',
    };
  }
}

/**
 * Capture part of an authorized hold — this is the real card charge for a
 * budget-item payment. Multiple partial captures are allowed while the total
 * stays within the authorized amount; the hold is finalized (captured) when
 * the full amount has been taken.
 *
 * @param {object} params
 * @param {string} params.holdId     - authorization id from authorizeHold
 * @param {number} params.amount
 * @param {string} params.reference  - unique reference for this capture
 * @param {string} [params.isFinal]  - force final capture (releases remainder)
 * @returns {Promise<{mode, status: 'completed'|'failed', providerReference?, failureReason?}>}
 */
async function captureFromHold({ holdId, amount, reference, isFinal = false }) {
  if (!isLiveMode() || String(holdId).startsWith('SIMAUTH-')) {
    return {
      mode: 'simulated',
      status: 'completed',
      providerReference: `simcap:${reference}`,
      failureReason: null,
    };
  }

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/payments/authorization/${encodeURIComponent(holdId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: { total: amount.toFixed(2), currency: CHARGE_CURRENCY },
          is_final_capture: Boolean(isFinal),
        }),
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.state !== 'captured') {
      return {
        mode: getPaymentMode(),
        status: 'failed',
        failureReason: extractProviderError(data, 'CAPTURE_FAILED'),
      };
    }

    return {
      mode: getPaymentMode(),
      status: 'completed',
      providerReference: data.parent_payment || data.id,
      failureReason: null,
    };
  } catch (error) {
    return {
      mode: getPaymentMode(),
      status: 'failed',
      failureReason: error.message || 'PAYMENT_PROVIDER_UNAVAILABLE',
    };
  }
}

/**
 * Reauthorize (extend) a hold before it expires so the budget stays funded
 * for the rest of the cycle. Issuer honor periods are ~3 days per
 * authorization, so the scheduler reauthorizes open holds.
 *
 * @returns {Promise<{mode, status, holdId?, expiresAt?, failureReason?}>}
 */
async function reauthorizeHold({ holdId, amount }) {
  if (!isLiveMode() || String(holdId).startsWith('SIMAUTH-')) {
    return {
      mode: 'simulated',
      status: 'completed',
      holdId,
      expiresAt: new Date(Date.now() + HOLD_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      failureReason: null,
    };
  }

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/payments/authorization/${encodeURIComponent(holdId)}/reauthorize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: { total: amount.toFixed(2), currency: CHARGE_CURRENCY },
        }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) {
      return {
        mode: getPaymentMode(),
        status: 'failed',
        failureReason: extractProviderError(data, 'REAUTHORIZE_FAILED'),
      };
    }
    return {
      mode: getPaymentMode(),
      status: 'completed',
      holdId: data.id,
      expiresAt: data.valid_until || null,
      failureReason: null,
    };
  } catch (error) {
    return {
      mode: getPaymentMode(),
      status: 'failed',
      failureReason: error.message || 'PAYMENT_PROVIDER_UNAVAILABLE',
    };
  }
}

/**
 * Release (void) the remaining amount of a hold — used when a funding cycle
 * ends so unspent budget money is returned to the card, or when a budget is
 * deactivated/cancelled with an open hold.
 *
 * @param {string} holdId - authorization id from authorizeHold
 * @returns {Promise<{mode, status: 'completed'|'failed', failureReason?}>}
 */
async function voidHold(holdId) {
  if (!isLiveMode() || String(holdId).startsWith('SIMAUTH-')) {
    return { mode: 'simulated', status: 'completed', failureReason: null };
  }

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/payments/authorization/${encodeURIComponent(holdId)}/void`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // PayPal returns 200 with the updated authorization on success; a
      // 400/RESOURCE_NOT_FOUND usually means the hold already expired/captured.
      const err = extractProviderError(data, 'VOID_FAILED');
      if (/NOT_FOUND|ALREADY/i.test(err) || response.status === 404) {
        return { mode: getPaymentMode(), status: 'completed', failureReason: null };
      }
      return { mode: getPaymentMode(), status: 'failed', failureReason: err };
    }

    return { mode: getPaymentMode(), status: 'completed', failureReason: null };
  } catch (error) {
    return {
      mode: getPaymentMode(),
      status: 'failed',
      failureReason: error.message || 'PAYMENT_PROVIDER_UNAVAILABLE',
    };
  }
}

module.exports = {
  isLiveMode,
  getPaymentMode,
  detectCardBrand,
  isValidCardNumber,
  vaultCard,
  authorizeHold,
  captureFromHold,
  reauthorizeHold,
  voidHold,
  HOLD_VALIDITY_DAYS,
};
