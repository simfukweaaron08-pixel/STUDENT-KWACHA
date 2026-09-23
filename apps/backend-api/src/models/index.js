const sequelize = require('../config/database');
const User = require('./User');
const AdminUser = require('./AdminUser');
const RefreshToken = require('./RefreshToken');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');
const SavingsGoal = require('./SavingsGoal');
const SavingsEntry = require('./SavingsEntry');
const Notification = require('./Notification');
const FinancialInsight = require('./FinancialInsight');
const AuditLog = require('./AuditLog');
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const PaymentMethod = require('./PaymentMethod');
const BudgetAllocation = require('./BudgetAllocation');
const FundingAttempt = require('./FundingAttempt');
const BudgetHold = require('./BudgetHold');

// ─── Associations ────────────────────────────────────────────

// User ↔ AdminUser
User.hasOne(AdminUser, { foreignKey: 'user_id', as: 'adminRole' });
AdminUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ Category (custom categories)
User.hasMany(Category, { foreignKey: 'created_by', as: 'customCategories' });
Category.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// User ↔ Transaction
User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category ↔ Transaction
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User ↔ Budget
User.hasMany(Budget, { foreignKey: 'user_id', as: 'budgets' });
Budget.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category ↔ Budget
Category.hasMany(Budget, { foreignKey: 'category_id', as: 'budgets' });
Budget.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User ↔ SavingsGoal
User.hasMany(SavingsGoal, { foreignKey: 'user_id', as: 'savingsGoals' });
SavingsGoal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// SavingsGoal ↔ SavingsEntry
SavingsGoal.hasMany(SavingsEntry, { foreignKey: 'savings_goal_id', as: 'entries' });
SavingsEntry.belongsTo(SavingsGoal, { foreignKey: 'savings_goal_id', as: 'savingsGoal' });

// User ↔ Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ FinancialInsight
User.hasMany(FinancialInsight, { foreignKey: 'user_id', as: 'financialInsights' });
FinancialInsight.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ AuditLog
User.hasMany(AuditLog, { foreignKey: 'actor_id', as: 'auditActions' });
AuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

// User ↔ Wallet (one per user)
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Wallet ↔ WalletTransaction
Wallet.hasMany(WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions' });
WalletTransaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

// BudgetHold ↔ WalletTransaction (each capture is a wallet tx drawn from a hold)
BudgetHold.hasMany(WalletTransaction, { foreignKey: 'hold_id', as: 'captures' });
WalletTransaction.belongsTo(BudgetHold, { foreignKey: 'hold_id', as: 'hold' });

// User ↔ PaymentMethod
User.hasMany(PaymentMethod, { foreignKey: 'user_id', as: 'paymentMethods' });
PaymentMethod.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Budget ↔ BudgetAllocation
Budget.hasMany(BudgetAllocation, { foreignKey: 'budget_id', as: 'allocations' });
BudgetAllocation.belongsTo(Budget, { foreignKey: 'budget_id', as: 'budget' });

// Category ↔ BudgetAllocation
Category.hasMany(BudgetAllocation, { foreignKey: 'category_id', as: 'budgetAllocations' });
BudgetAllocation.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Budget ↔ FundingAttempt
Budget.hasMany(FundingAttempt, { foreignKey: 'budget_id', as: 'fundingAttempts' });
FundingAttempt.belongsTo(Budget, { foreignKey: 'budget_id', as: 'budget' });

// PaymentMethod ↔ FundingAttempt
PaymentMethod.hasMany(FundingAttempt, { foreignKey: 'payment_method_id', as: 'fundingAttempts' });
FundingAttempt.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod' });

// Budget ↔ BudgetHold (card authorization per funding cycle)
Budget.hasMany(BudgetHold, { foreignKey: 'budget_id', as: 'holds' });
BudgetHold.belongsTo(Budget, { foreignKey: 'budget_id', as: 'budget' });

// PaymentMethod ↔ BudgetHold
PaymentMethod.hasMany(BudgetHold, { foreignKey: 'payment_method_id', as: 'budgetHolds' });
BudgetHold.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod' });

// FundingAttempt ↔ BudgetHold
FundingAttempt.hasOne(BudgetHold, { foreignKey: 'funding_attempt_id', as: 'hold' });
BudgetHold.belongsTo(FundingAttempt, { foreignKey: 'funding_attempt_id', as: 'fundingAttempt' });

module.exports = {
  sequelize,
  User,
  AdminUser,
  RefreshToken,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  SavingsEntry,
  Notification,
  FinancialInsight,
  AuditLog,
  Wallet,
  WalletTransaction,
  PaymentMethod,
  BudgetAllocation,
  FundingAttempt,
  BudgetHold,
};
