const { z } = require('zod');

const paySchema = z.object({
  body: z.object({
    amount: z.number().positive('Payment amount must be positive'),
    description: z.string().max(255).optional(),
    // Expense category this payment is drawn from (required — the wallet
    // only holds budget money, so every payment targets a budget expense)
    category_id: z.string().uuid().nullable().optional(),
  }),
});

const limitsSchema = z.object({
  body: z.object({
    daily_limit: z.number().positive().nullable().optional(),
    monthly_limit: z.number().positive().nullable().optional(),
  }),
});

module.exports = { paySchema, limitsSchema };
