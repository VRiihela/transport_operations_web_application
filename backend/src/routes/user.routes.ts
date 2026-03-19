import { Router, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { UserRole as LocalUserRole } from '../types/auth.types';
import { AuthenticatedRequest } from '../types/auth.types';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/users?role=Driver
router.get(
  '/',
  requireRole(LocalUserRole.Admin, LocalUserRole.Dispatcher),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { role } = req.query;

    const validRoles: UserRole[] = ['Admin', 'Dispatcher', 'Driver'];
    const roleFilter =
      typeof role === 'string' && validRoles.includes(role as UserRole)
        ? (role as UserRole)
        : undefined;

    try {
      const users = await prisma.user.findMany({
        where: roleFilter ? { role: roleFilter } : {},
        select: { id: true, name: true, email: true, role: true },
        orderBy: { email: 'asc' },
      });
      res.json({ data: users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export { router as userRoutes };
