import { Router } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '../types/auth.types';
import { createJob, getJobs, getJobById, updateJob, deleteJob } from '../controllers/job.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(UserRole.Admin, UserRole.Dispatcher), createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.patch('/:id', requireRole(UserRole.Admin, UserRole.Dispatcher), updateJob);
router.delete('/:id', requireRole(UserRole.Admin), deleteJob);

export { router as jobRoutes };
