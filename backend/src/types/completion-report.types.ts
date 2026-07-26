import { z } from 'zod';

export const upsertCompletionReportSchema = z
  .object({
    workDescription: z.string().min(1, 'Work description is required').max(2000, 'Work description too long').trim(),
    actualStart: z.string().datetime('Invalid actualStart date format'),
    actualEnd: z.string().datetime('Invalid actualEnd date format'),
    customerName: z.string().min(1, 'Customer name is required').max(100, 'Customer name too long').trim(),
    customerSignature: z.string().min(1, 'Customer signature is required').nullish(),
    noSignatureReason: z.string().min(1, 'Reason is required when no signature is provided').max(500, 'Reason too long').trim().nullish(),
  })
  .refine((data) => new Date(data.actualEnd) > new Date(data.actualStart), {
    message: 'actualEnd must be after actualStart',
    path: ['actualEnd'],
  })
  .refine((data) => Boolean(data.customerSignature) || Boolean(data.noSignatureReason), {
    message: 'Either a customer signature or a reason for the missing signature is required',
    path: ['customerSignature'],
  });

export type UpsertCompletionReportRequest = z.infer<typeof upsertCompletionReportSchema>;
