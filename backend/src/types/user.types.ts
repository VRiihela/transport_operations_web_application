import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  role: z.enum(['Driver', 'Dispatcher'], {
    errorMap: () => ({ message: 'Role must be Driver or Dispatcher' }),
  }),
});

export const updateUserSchema = z
  .object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().optional(),
    role: z
      .enum(['Driver', 'Dispatcher'], {
        errorMap: () => ({ message: 'Role must be Driver or Dispatcher' }),
      })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const getUsersQuerySchema = z.object({
  role: z.enum(['Admin', 'Dispatcher', 'Driver']).optional(),
});
