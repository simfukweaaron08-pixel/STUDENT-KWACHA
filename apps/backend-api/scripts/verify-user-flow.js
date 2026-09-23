/**
 * End-to-end verification of the student budgeting user flow.
 *
 * Run with the API server started (or standalone — it boots the app itself
 * when required as main):  node scripts/verify-user-flow.js
 *
 * Covers:
 *   1. Sign up with student info
 *   2. Link card via PayPal processor (simulated mode)
 *   3. Create budget with expense-category allocations
 *   4. Confirm & activate (funding scheduled)
 *   5. Automatic funding: card charged, wallet credited, allocations funded
 *   6. Budget-restricted spending: allocation ring-fencing enforced
 *   7. Payment failure → notify → retry flow
 *   8. Recurring budget: next funding date advances
 *   9. Funding status endpoint (dashboard data)
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const sequelize = require('../src/config/database');
const {
  User, Category, Budget, BudgetAllocation, FundingAttempt,
  Wallet, WalletTransaction, PaymentMethod, Notification,
} = require('../src/models');
const { fundBudget } = require('../src/services/fundingEngine');
const { retryFunding } = require('../src/services/fundingEngine');
const { checkBudgetRestrictions } = require('../src/services/budgetEnforcement');
const { computeNextFundingDate } = require('../src/utils/dates');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('\n════════════════════════════════════════════════');
  console.log(' Student Kwacha — User Flow Verification');
  console.log('════════════════════════════════════════════════\n');

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const runId = uuidv4().slice(0, 8);
  const email = `flowtest-${runId}@example.com`;

  // ── Step 1: Sign up with student info ────────────────────────
  console.log('1) Sign up (student info)');
  const user = await User.create({
    email,
    full_name: 'Flow Test Student',
    password_hash: await bcrypt.hash('password123', 12),
    is_student: true,
    institution: 'University of Zambia',
    student_id: `SB${runId}`,
  });
  check('user created with institution + student id',
    user.is_student === true && user.institution === 'University of Zambia' && Boolean(user.student_id));

  // ── Step 2: Link card ────────────────────────────────────
  console.log('\n2) Link card (no PayPal account needed)');
  const paypal = require('../src/services/paypal');
  const vault = await paypal.vaultCard({
    cardNumber: '4242424242424242',
    expMonth: 12,
    expYear: new Date().getFullYear() + 3,
    cardholderName: 'Flow Test Student',
    cvv: '123',
  });
  const pm = await PaymentMethod.create({
    user_id: user.id,
    provider: 'paypal',
    method_type: 'card',
    vault_token: vault.vaultToken,
    card_brand: vault.brand,
    card_last4: vault.last4,
    exp_month: vault.expMonth,
    exp_year: vault.expYear,
    cardholder_name: 'Flow Test Student',
    funding_source_description: `${vault.brand} •• ${vault.last4}`,
  });
  check('card linked (vault token + last4 stored, no full PAN)',
    Boolean(pm.vault_token) && pm.card_last4 === '4242' && !pm.paypal_email && pm.status === 'active');

  // ── Step 3: Create budget with allocations ───────────────────
  console.log('\n3) Create budget: "September Monthly Expenses" K3,000');
  const cats = {};
  for (const name of ['Food', 'Transport', 'Housing', 'Communication', 'Other']) {
    cats[name] = (await Category.findOrCreate({
      where: { name },
      defaults: { name, is_system: true },
    }))[0];
  }

  const today = new Date();
  const budget = await Budget.create({
    user_id: user.id,
    name: 'September Monthly Expenses',
    amount: 3000,
    period: 'monthly',
    frequency: 'monthly',
    funding_day: Math.min(today.getDate(), 28),
    start_date: today.toISOString().slice(0, 10),
    payment_method_id: pm.id,
    is_active: true,
    next_funding_date: today.toISOString().slice(0, 10), // due now
  });

  const allocationPlan = [
    { category: 'Food', amount: 800 },
    { category: 'Transport', amount: 400 },
    { category: 'Housing', amount: 1500 },
    { category: 'Communication', amount: 200 },
    { category: 'Other', amount: 100 },
  ];
  for (const a of allocationPlan) {
    await BudgetAllocation.create({
      budget_id: budget.id,
      category_id: cats[a.category].id,
      allocated_amount: a.amount,
      spent_amount: 0,
    });
  }
  const allocs = await BudgetAllocation.findAll({ where: { budget_id: budget.id } });
  check('5 expense allocations created summing to K3,000',
    allocs.length === 5 &&
    allocs.reduce((s, a) => s + parseFloat(a.allocated_amount), 0) === 3000);

  // ── Step 4: Automatic funding (funding date reached) ─────────
  console.log('\n4) Automatic funding — card is charged');
  const wallet = await Wallet.create({ user_id: user.id, balance: 0 });

  const result = await fundBudget(budget, today.toISOString().slice(0, 10));
  check('card charge completed (simulated mode)', result.status === 'completed');

  await wallet.reload();
  check('wallet credited with K3,000', parseFloat(wallet.balance) === 3000,
    `balance=${wallet.balance}`);

  const fundingTx = await WalletTransaction.findOne({
    where: { wallet_id: wallet.id, type: 'funding' },
  });
  check('funding transaction recorded', Boolean(fundingTx) && parseFloat(fundingTx.amount) === 3000);

  await budget.reload();
  check('budget marked funded + next funding date advanced to next month',
    budget.is_funded === true &&
    budget.next_funding_date === computeNextFundingDate(budget, new Date()));

  const attempt = await FundingAttempt.findOne({ where: { budget_id: budget.id } });
  check('funding attempt recorded as completed', attempt?.status === 'completed');

  // ── Step 5: Budget-restricted spending ───────────────────────
  console.log('\n5) Budget-restricted spending');
  const foodCatId = cats['Food'].id;
  const transportCatId = cats['Transport'].id;

  // Food: K800 allocated
  let r = await checkBudgetRestrictions(user.id, { amount: 500, categoryId: foodCatId });
  check('Food: K500 allowed (within K800 allocation)', r.allowed === true);

  r = await checkBudgetRestrictions(user.id, { amount: 900, categoryId: foodCatId });
  check('Food: K900 blocked (exceeds K800 allocation)', r.allowed === false,
    JSON.stringify(r.violations));

  r = await checkBudgetRestrictions(user.id, { amount: 100, categoryId: transportCatId });
  check('Transport: K100 allowed (within K400 allocation)', r.allowed === true);

  // A category with no allocation must be blocked while funded money exists
  const entertainment = (await Category.findOrCreate({
    where: { name: 'Entertainment' },
    defaults: { name: 'Entertainment', is_system: true },
  }))[0];
  r = await checkBudgetRestrictions(user.id, { amount: 50, categoryId: entertainment.id });
  check('Entertainment: blocked (no allocation — funds are ring-fenced)', r.allowed === false);

  r = await checkBudgetRestrictions(user.id, { amount: 50, categoryId: null });
  check('Uncategorised payment: blocked (must pick the budget category)', r.allowed === false);

  // Record a spend and confirm remaining shrinks
  const { recordAllocationSpend } = require('../src/services/budgetEnforcement');
  await sequelize.transaction(async (t) => {
    await recordAllocationSpend(user.id, {
      categoryId: foodCatId, amount: 350, transaction: t,
    });
  });
  r = await checkBudgetRestrictions(user.id, { amount: 500, categoryId: foodCatId });
  check('Food: after K350 spent, K500 blocked (only K450 remains)', r.allowed === false);
  r = await checkBudgetRestrictions(user.id, { amount: 450, categoryId: foodCatId });
  check('Food: K450 allowed after K350 spent', r.allowed === true);

  // ── Step 6: Payment failure → notify → retry ─────────────────
  console.log('\n6) Payment failure → notify → retry');
  // Second budget with the demo failure trigger (.13 cents)
  const budget2 = await Budget.create({
    user_id: user.id,
    name: 'October Budget (failure demo)',
    amount: 300.13,
    period: 'monthly',
    frequency: 'monthly',
    funding_day: Math.min(today.getDate(), 28),
    start_date: today.toISOString().slice(0, 10),
    payment_method_id: pm.id,
    is_active: true,
    next_funding_date: today.toISOString().slice(0, 10),
  });
  await BudgetAllocation.create({
    budget_id: budget2.id,
    category_id: foodCatId,
    allocated_amount: 300.13,
  });

  const failResult = await fundBudget(budget2, today.toISOString().slice(0, 10));
  check('charge failed (simulated decline trigger)', failResult.status === 'failed');
  check('failure reason recorded on the attempt',
    Boolean(failResult.attempt?.failure_reason));

  await budget2.reload();
  check('budget NOT marked funded after failed payment', budget2.is_funded === false);

  const failNotif = await Notification.findOne({
    where: { user_id: user.id, type: 'funding_failed' },
  });
  check('student notified of the failure', Boolean(failNotif));

  // Retry with the failure trigger removed (amount now succeeds)
  await budget2.update({ amount: 300.5 });
  await BudgetAllocation.update(
    { allocated_amount: 300.5 },
    { where: { budget_id: budget2.id } }
  );
  const retry = await retryFunding(budget2);
  check('retry succeeds after payment method works again', retry.status === 'completed');
  await wallet.reload();
  check('wallet credited again on successful retry (K3,300.50)',
    Math.abs(parseFloat(wallet.balance) - 3300.5) < 0.001,
    `balance=${wallet.balance}`);

  // ── Step 7: Recurring schedule ───────────────────────────────
  console.log('\n7) Recurring budget schedule');
  const next = computeNextFundingDate(
    { frequency: 'monthly', funding_day: 1 },
    new Date(2026, 8, 1) // Sep 1 2026
  );
  check('monthly budget funded Sep 1 → next funding Oct 1', next === '2026-10-01', next);
  const next2 = computeNextFundingDate(
    { frequency: 'one_time', funding_day: 1 },
    new Date(2026, 8, 1)
  );
  check('one_time budget → no next funding date', next2 === null);

  // ── Step 8: Funding status (dashboard data) ──────────────────
  console.log('\n8) Funding status endpoint data');
  const { getFundingStatus } = require('../src/controllers/budgets');
  const req = { userId: user.id };
  const res = {
    json: (payload) => payload,
    status() { return this; },
  };
  let statusPayload;
  const nextRes = {
    ...res,
    json: (p) => { statusPayload = p; return p; },
  };
  await getFundingStatus(req, nextRes, (e) => { throw e; });
  const statusData = statusPayload?.data;
  check('funding status: upcoming funding listed for main budget',
    Array.isArray(statusData?.upcoming_funding) && statusData.upcoming_funding.length >= 1);
  check('funding status: wallet funding balance = unspent allocations',
    Math.abs((statusData?.wallet_funding_balance ?? 0) - (3000 - 350 + 300.5)) < 0.001,
    `got ${statusData?.wallet_funding_balance}`);

  // ── Cleanup ──────────────────────────────────────────────────
  console.log('\nCleaning up test data…');
  await FundingAttempt.destroy({ where: { budget_id: [budget.id, budget2.id] } });
  await BudgetAllocation.destroy({ where: { budget_id: [budget.id, budget2.id] } });
  await Budget.destroy({ where: { user_id: user.id } });
  await WalletTransaction.destroy({ where: { wallet_id: wallet.id } });
  await Wallet.destroy({ where: { user_id: user.id } });
  await PaymentMethod.destroy({ where: { user_id: user.id } });
  await Notification.destroy({ where: { user_id: user.id } });
  await User.destroy({ where: { id: user.id } });

  console.log('\n════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\n❌ Verification crashed:', error);
  process.exit(1);
});
