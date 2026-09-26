const { z } = require('zod');

const linkCardSchema = z.object({
  body: z.object({
    card_number: z.string()
      .min(12, 'Card number is required')
      .max(23, 'Card number is too long')
      .regex(/^[\d\s-]+$/, 'Card number may only contain digits'),
    exp_month: z.number().int().min(1, 'Expiry month must be 1-12').max(12),
    exp_year: z.number().int().min(new Date().getFullYear(), 'Card year is in the past')
      .max(new Date().getFullYear() + 25, 'Card year is too far in the future'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
    cardholder_name: z.string().min(2, 'Cardholder name is required').max(255),
  }),
});

module.exports = { linkCardSchema };
