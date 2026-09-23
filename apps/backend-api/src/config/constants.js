module.exports = {
  // User status
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
  },

  // Admin roles
  ADMIN_ROLE: {
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },

  // Transaction types
  TRANSACTION_TYPE: {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
  },

  // Category source
  CATEGORY_SOURCE: {
    AUTO: 'auto',
    MANUAL: 'manual',
  },

  // Budget periods
  BUDGET_PERIOD: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
  },

  // Savings frequency
  SAVINGS_FREQUENCY: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly',
  },

  // Savings goal status
  SAVINGS_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
  },

  // Mobile money providers
  MOBILE_MONEY_PROVIDER: {
    AIRTEL_MONEY: 'airtel_money',
    MTN_MOMO: 'mtn_momo',
  },

  // Sync status
  SYNC_STATUS: {
    SYNCED: 'synced',
    SYNCING: 'syncing',
    ERROR: 'error',
    PENDING: 'pending',
  },

  // Notification types
  NOTIFICATION_TYPE: {
    BUDGET_ALERT: 'budget_alert',
    SAVINGS_REMINDER: 'savings_reminder',
    SYNC_STATUS: 'sync_status',
    INSIGHT: 'insight',
    GENERAL: 'general',
  },

  // Insight types
  INSIGHT_TYPE: {
    SPENDING_TIP: 'spending_tip',
    SAVINGS_TIP: 'savings_tip',
    BUDGET_TIP: 'budget_tip',
    TREND_ALERT: 'trend_alert',
    CATEGORY_INSIGHT: 'category_insight',
  },

  // Priority levels
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  },

  // Audit actor types
  ACTOR_TYPE: {
    USER: 'user',
    ADMIN: 'admin',
    SYSTEM: 'system',
  },

  // Default categories
  DEFAULT_CATEGORIES: [
    { name: 'Food', icon: 'restaurant', color: '#FF6B35' },
    { name: 'Transport', icon: 'directions_car', color: '#4ECDC4' },
    { name: 'Utilities', icon: 'power', color: '#45B7D1' },
    { name: 'Entertainment', icon: 'movie', color: '#96CEB4' },
    { name: 'Shopping', icon: 'shopping_bag', color: '#FFEAA7' },
    { name: 'Education', icon: 'school', color: '#DDA0DD' },
    { name: 'Healthcare', icon: 'local_hospital', color: '#FF6B6B' },
    { name: 'Housing', icon: 'home', color: '#C9B1FF' },
    { name: 'Communication', icon: 'phone', color: '#98D8C8' },
    { name: 'Savings', icon: 'savings', color: '#F7DC6F' },
    { name: 'Income', icon: 'payments', color: '#82E0AA' },
    { name: 'Other', icon: 'more_horiz', color: '#AEB6BF' },
  ],

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    LOGIN_MAX: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000,
  },

  // Currency
  CURRENCY: 'ZMW',
};
