import { z } from 'zod';

export const createParcelSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Description too long').trim(),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').default(1),
});

export const updateParcelSchema = createParcelSchema.partial();

export type CreateParcelRequest = z.infer<typeof createParcelSchema>;
export type UpdateParcelRequest = z.infer<typeof updateParcelSchema>;
