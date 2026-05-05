import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  phone: z.string().min(1).max(50).trim(),
  email: z.string().email().nullish(),
  type: z.enum(['PRIVATE', 'BUSINESS']),
  companyName: z.string().max(255).trim().nullish(),
  referenceNumber: z.string().max(100).trim().nullish(),
});

export const customerSearchQuerySchema = z.object({
  phone: z.string().min(1).max(50).trim(),
});

export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type CustomerSearchQuery = z.infer<typeof customerSearchQuerySchema>;
