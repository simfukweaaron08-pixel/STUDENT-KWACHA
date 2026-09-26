const { z } = require('zod');

const createSavingsGoalSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Goal name is required').max(255),
    target_amount: z.number().positive('Target amount must be positive'),
    target_date: z.string().date(),
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  }),
});

const updateSavingsGoalSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    target_amount: z.number().positive().optional(),
    target_date: z.string().date().optional(),
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
    status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  }),
});

const addSavingsEntrySchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    entry_date: z.string().date(),
  }),
});

module.exports = {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  addSavingsEntrySchema,
};
