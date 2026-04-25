import { Router } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '../types/auth.types';
import { createJob, getJobs, getJobById, updateJob, updateJobStatus, updateDriverNotes, upsertCompletionReport, approveCompletionReport, deleteJob } from '../controllers/job.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(UserRole.Admin, UserRole.Dispatcher), createJob);
router.get('/', requireRole(UserRole.Admin, UserRole.Dispatcher), getJobs);
router.get('/:id', getJobById);
router.patch('/:id/notes', requireRole(UserRole.Driver), updateDriverNotes);
router.patch('/:id/status', requireRole(UserRole.Driver), updateJobStatus);
router.post('/:id/completion-report', upsertCompletionReport);
router.post('/:id/completion-report/approve', requireRole(UserRole.Admin, UserRole.Dispatcher), approveCompletionReport);
router.patch('/:id', requireRole(UserRole.Admin, UserRole.Dispatcher), updateJob);
router.delete('/:id', requireRole(UserRole.Admin), deleteJob);

export { router as jobRoutes };
