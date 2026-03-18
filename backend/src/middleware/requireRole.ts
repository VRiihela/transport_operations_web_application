import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/auth.types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export const adminOnly = requireRole(UserRole.Admin);
export const adminOrDispatcher = requireRole(UserRole.Admin, UserRole.Dispatcher);
export const blockDrivers = requireRole(UserRole.Admin, UserRole.Dispatcher);
