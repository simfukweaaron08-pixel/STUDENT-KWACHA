const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    full_name: z.string().min(2).max(255).optional(),
    phone_number: z.string().min(10).max(20).optional(),
    profile_image_url: z.string().url().optional(),
    currency: z.string().length(3).optional(),
  }),
});

module.exports = { updateProfileSchema };
