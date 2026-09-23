const { z } = require('zod');

const allocationSchema = z.object({
  category_id: z.string().uuid('A valid category is required for each allocation'),
  amount: z.number().positive('Allocation amount must be positive'),
});

const createBudgetSchema = z.object({
  body: z.object({
    category_id: z.string().uuid().nullable().optional(),
    name: z.string().min(1, 'Budget name is required').max(255).optional(),
    amount: z.number().positive('Budget amount must be positive'),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    start_date: z.string().date(),
    end_date: z.string().date().nullable().optional(),
    alert_threshold: z.number().min(0).max(100).optional(),
    enforce: z.boolean().optional(), // strict budget: block transactions that would exceed it
    frequency: z.enum(['one_time', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    funding_day: z.number().int().min(1).max(28).nullable().optional(),
    payment_method_id: z.string().uuid().nullable().optional(),
    allocations: z.array(allocationSchema).min(1).max(30).optional(),
  }).refine(
    (data) => !data.allocations || data.allocations.reduce((s, a) => s + a.amount, 0) <= data.amount + 0.001,
    { message: 'Sum of allocations cannot exceed the budget amount', path: ['allocations'] }
  ),
});

const updateBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    end_date: z.string().date().nullable().optional(),
    is_active: z.boolean().optional(),
    alert_threshold: z.number().min(0).max(100).optional(),
    enforce: z.boolean().optional(),
    frequency: z.enum(['one_time', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    funding_day: z.number().int().min(1).max(28).nullable().optional(),
    payment_method_id: z.string().uuid().nullable().optional(),
    allocations: z.array(allocationSchema).min(1).max(30).optional(),
  }),
});

module.exports = { createBudgetSchema, updateBudgetSchema };
