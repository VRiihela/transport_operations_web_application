import { Router } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { adminOrDispatcher } from '../middleware/requireRole';
import { createTeam, getTeams, updateTeam, deleteTeam } from '../controllers/team.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', adminOrDispatcher, createTeam);
router.get('/', getTeams);
router.patch('/:id', adminOrDispatcher, updateTeam);
router.delete('/:id', adminOrDispatcher, deleteTeam);

export { router as teamRoutes };
