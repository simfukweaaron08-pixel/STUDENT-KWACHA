const { z } = require('zod');

const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    type: z.enum(['income', 'expense', 'transfer']),
    description: z.string().optional(),
    category_id: z.string().uuid().optional(),
    source: z.string().optional(),
    reference_number: z.string().optional(),
    transaction_date: z.string().datetime().or(z.string().date()),
    is_recurring: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    description: z.string().optional(),
    category_id: z.string().uuid().optional(),
    source: z.string().optional(),
    is_recurring: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const transactionQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    category_id: z.string().uuid().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    source: z.string().optional(),
    min_amount: z.coerce.number().optional(),
    max_amount: z.coerce.number().optional(),
    search: z.string().optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    category_id: z.string().uuid('Invalid category ID'),
    category_source: z.enum(['auto', 'manual']).optional(),
  }),
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  updateCategorySchema,
};
