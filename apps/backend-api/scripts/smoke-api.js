/**
 * HTTP smoke test for the student budgeting flow.
 * Requires the API server running (PORT from apps/backend-api/.env).
 *
 *   node scripts/smoke-api.js [baseUrl]
 */

const BASE = process.argv[2] || `http://localhost:${process.env.PORT || 3300}/api/v1`;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

async function main() {
  console.log(`\n🔥 Smoke testing ${BASE}\n`);

  // Health
  const health = await api('GET', '/health');
  check('API is up', health.status === 200);

  const email = `smoke-${Date.now()}@example.com`;

  // 1. Register with student info
  const reg = await api('POST', '/auth/register', {
    body: {
      email,
      full_name: 'Smoke Test Student',
      password: 'password123',
      confirm_password: 'password123',
      institution: 'University of Zambia',
      student_id: 'SMK-001',
    },
  });
  check('register with student info → 201', reg.status === 201, JSON.stringify(reg.json));
  check('student fields returned', reg.json?.data?.user?.institution === 'University of Zambia');
  const token = reg.json?.data?.accessToken;
  check('JWT access token issued', Boolean(token));

  // 2. No payment method → activating a budget fails with a clear error
  const badActivate = await api('POST', '/budgets', {});
  void badActivate; // placeholder to keep ordering readable

  const mkBudget = async (amount, fundingDay, cents) => {
    const cats = await api('GET', '/categories', { token });
    const food = cats.json.data.find((c) => c.name === 'Food');
    const housing = cats.json.data.find((c) => c.name === 'Housing');
    const r = await api('POST', '/budgets', {
      token,
      body: {
        name: `Smoke Budget ${cents ?? ''}`,
        amount,
        frequency: 'monthly',
        funding_day: fundingDay,
        start_date: new Date().toISOString().slice(0, 10),
        allocations: [
          { category_id: food.id, amount: Math.round(amount * 0.6 * 100) / 100 },
          { category_id: housing.id, amount: Math.round(amount * 0.4 * 100) / 100 },
        ],
      },
    });
    return r.json?.data?.id;
  };

  // Budget creation works without payment method (activate is what requires it)
  const budgetId = await mkBudget(100, 1);
  check('budget with allocations created', Boolean(budgetId));

  const actNoPm = await api('POST', `/budgets/${budgetId}/activate`, { token });
  check('activate without card → PAYMENT_METHOD_REQUIRED', actNoPm.status === 400 &&
    actNoPm.json?.error?.code === 'PAYMENT_METHOD_REQUIRED', JSON.stringify(actNoPm.json));

  // 3. Link a card (no PayPal account needed; simulated vault)
  const conn = await api('POST', '/payment-methods/link-card', {
    token,
    body: {
      card_number: '4242424242424242',
      exp_month: 12,
      exp_year: new Date().getFullYear() + 3,
      cvv: '123',
      cardholder_name: 'Smoke Test Student',
    },
  });
  check('link card → 201 (vaulted, last4 only)', conn.status === 201 &&
    conn.json?.data?.card_last4 === '4242' && !conn.json.data.card_number, JSON.stringify(conn.json));
  const pmId = conn.json?.data?.id;

  // Invalid card rejected by Luhn pre-check
  const badCard = await api('POST', '/payment-methods/link-card', {
    token,
    body: {
      card_number: '4242424242424241',
      exp_month: 12,
      exp_year: new Date().getFullYear() + 3,
      cvv: '123',
      cardholder_name: 'Smoke Test Student',
    },
  });
  check('invalid card number → 400 INVALID_CARD', badCard.status === 400 &&
    badCard.json?.error?.code === 'INVALID_CARD', JSON.stringify(badCard.json));

  // 4. Activate with card linked → scheduled
  const act = await api('POST', `/budgets/${budgetId}/activate`, { token });
  check('activate with card → 200 + scheduled', act.status === 200 &&
    Boolean(act.json?.data?.next_funding_date), JSON.stringify(act.json));

  // 5. Budget-restricted spending via the wallet pay endpoint
  //    Fund the budget first by simulating the due date passing (scheduler
  //    runs at boot); instead fund directly through the funding engine via
  //    retry endpoint — amount 60.13 triggers the simulated decline.
  const failBudget = await mkBudget(60.13, 1, 13);
  await api('POST', `/budgets/${failBudget}/activate`, { token });
  const failRetry = await api('POST', `/budgets/${failBudget}/retry-funding`, { token });
  check('retry on failed charge → 402 with reason', failRetry.status === 402 &&
    Boolean(failRetry.json?.error?.message), JSON.stringify(failRetry.json));

  // Notifications should now contain the failure
  const notifs = await api('GET', '/notifications', { token });
  const failedNotif = (notifs.json?.data ?? []).find?.((n) => n.type === 'funding_failed') ??
    (notifs.json?.data?.rows ?? []).find((n) => n.type === 'funding_failed');
  check('failure notification created', Boolean(failedNotif));

  // 6. Fund successfully by topping up the demo trigger: retry with a good amount
  //    (edit the budget amount to remove the .13 trigger, then retry)
  const editBudget = await api('PUT', `/budgets/${failBudget}`, {
    token,
    body: { amount: 60 },
  });
  check('budget amount updated', editBudget.status === 200);

  const okRetry = await api('POST', `/budgets/${failBudget}/retry-funding`, { token });
  check('retry with valid charge → success', okRetry.status === 200 &&
    okRetry.json?.data?.status === 'completed', JSON.stringify(okRetry.json));

  // 7. Wallet now holds the funds; budget-restricted pay is enforced
  const wallet = await api('GET', '/wallet', { token });
  check('wallet credited K60', Math.abs(parseFloat(wallet.json.data.balance) - 60) < 0.001,
    wallet.json.data?.balance);

  const cats = await api('GET', '/categories', { token });
  const food = cats.json.data.find((c) => c.name === 'Food');
  const housing = cats.json.data.find((c) => c.name === 'Housing');

  const blockedPay = await api('POST', '/wallet/pay', {
    token,
    body: { amount: 50, category_id: food.id },
  });
  check('pay K50 from Food (only K36 allocated) → BUDGET_RESTRICTION',
    blockedPay.status === 403 && blockedPay.json?.error?.code === 'BUDGET_RESTRICTION',
    JSON.stringify(blockedPay.json));

  const overBalancePay = await api('POST', '/wallet/pay', {
    token,
    body: { amount: 100, category_id: food.id },
  });
  check('pay K100 from Food (K36 allocated) → BUDGET_RESTRICTION',
    overBalancePay.status === 403 && overBalancePay.json?.error?.code === 'BUDGET_RESTRICTION',
    JSON.stringify(overBalancePay.json));

  const allowedPay = await api('POST', '/wallet/pay', {
    token,
    body: { amount: 20, category_id: food.id },
  });
  check('pay K20 from Food allocation → success', allowedPay.status === 201,
    JSON.stringify(allowedPay.json));

  const crossPay = await api('POST', '/wallet/pay', {
    token,
    body: { amount: 5, category_id: housing.id },
  });
  check('pay K5 from Housing allocation → success', crossPay.status === 201);

  const uncatPay = await api('POST', '/wallet/pay', { token, body: { amount: 5 } });
  check('uncategorised pay → blocked (funds are ring-fenced)', uncatPay.status === 403);

  const otherCatPay = await api('POST', '/wallet/pay', {
    token,
    body: { amount: 5, category_id: cats.json.data.find((c) => c.name === 'Entertainment').id },
  });
  check('pay to unallocated category → blocked', otherCatPay.status === 403);

  // 8. Funding status endpoint + hold model checks
  const fs = await api('GET', '/budgets/funding-status', { token });
  check('funding-status lists upcoming funding', (fs.json?.data?.upcoming_funding ?? []).length >= 1);
  check('funding-status reports held funds',
    (fs.json?.data?.wallet_funding_balance ?? 0) > 0);

  // Wallet reports the open card hold backing the funded budget
  const walletAfter = await api('GET', '/wallet', { token });
  const openHolds = walletAfter.json?.data?.open_holds ?? [];
  check('wallet reports open card hold', openHolds.length >= 1,
    JSON.stringify(walletAfter.json?.data?.open_holds));
  check('hold captures tracked (20+5 captured)',
    openHolds.some((h) => parseFloat(h.amount_captured) >= 25),
    JSON.stringify(openHolds));

  // Top-ups are gone: wallet is budget-funded only
  const topupAttempt = await api('POST', '/wallet/topup', {
    token,
    body: { amount: 50, phone_number: '260970000000', network: 'airtel_money' },
  });
  check('top-ups removed → 404', topupAttempt.status === 404);

  // Cleanup best-effort
  await api('DELETE', `/budgets/${budgetId}`, { token });
  await api('DELETE', `/budgets/${failBudget}`, { token });

  console.log(`\n════════════════════════════════════════════════`);
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
