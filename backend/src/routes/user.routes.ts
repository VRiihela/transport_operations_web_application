import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { UserRole, AuthenticatedRequest } from '../types/auth.types';
import { UserService } from '../services/user.service';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  getUsersQuerySchema,
} from '../types/user.types';

const router = Router();
const userService = new UserService(new PrismaClient());

function isPrismaNotFound(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025';
}

router.use(authenticateToken);

// GET /api/users — Admin and Dispatcher (Dispatcher uses it for job assignment dropdown)
router.get(
  '/',
  requireRole(UserRole.Admin, UserRole.Dispatcher),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = getUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.errors });
      return;
    }
    try {
      const users = await userService.listUsers(parsed.data.role as Parameters<typeof userService.listUsers>[0]);
      res.json({ data: users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/users — Admin only
router.post(
  '/',
  requireRole(UserRole.Admin),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    try {
      const user = await userService.createUser(parsed.data);
      res.status(201).json({ data: user });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/users/:id — Admin only
router.patch(
  '/:id',
  requireRole(UserRole.Admin),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }

    // Prevent admin from deactivating their own account
    if (parsed.data.isActive === false && req.user!.id === req.params['id']) {
      res.status(403).json({ error: 'Cannot deactivate your own account' });
      return;
    }

    try {
      const user = await userService.updateUser(req.params['id'] as string, parsed.data);
      res.json({ data: user });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      if (isPrismaNotFound(error)) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/users/:id/reset-password — Admin only
router.post(
  '/:id/reset-password',
  requireRole(UserRole.Admin),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    try {
      const user = await userService.resetPassword(req.params['id'] as string, parsed.data.newPassword);
      res.json({ data: user });
    } catch (error) {
      if (isPrismaNotFound(error)) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export { router as userRoutes };
