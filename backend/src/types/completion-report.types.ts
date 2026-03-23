import { z } from 'zod';

export const upsertCompletionReportSchema = z
  .object({
    workDescription: z.string().min(1, 'Work description is required').max(2000, 'Work description too long').trim(),
    actualStart: z.string().datetime('Invalid actualStart date format'),
    actualEnd: z.string().datetime('Invalid actualEnd date format'),
    customerName: z.string().min(1, 'Customer name is required').max(100, 'Customer name too long').trim(),
    customerSignature: z.string().min(1, 'Customer signature is required'),
  })
  .refine((data) => new Date(data.actualEnd) > new Date(data.actualStart), {
    message: 'actualEnd must be after actualStart',
    path: ['actualEnd'],
  });

export type UpsertCompletionReportRequest = z.infer<typeof upsertCompletionReportSchema>;
