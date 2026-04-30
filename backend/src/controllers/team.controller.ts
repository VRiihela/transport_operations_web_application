import { Response } from 'express';
import { PrismaClient, UserRole, JobStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types';
import { createTeamSchema, updateTeamSchema, teamQuerySchema } from '../types/team.types';

const prisma = new PrismaClient();

const teamInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} as const;

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  const { name, date, driverIds } = parsed.data;

  try {
    const drivers = await prisma.user.findMany({
      where: { id: { in: driverIds }, role: UserRole.Driver, isActive: true },
      select: { id: true },
    });
    if (drivers.length !== driverIds.length) {
      res.status(400).json({ error: 'One or more users are not valid drivers' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name,
        date: new Date(date),
        createdById: req.user!.id,
        members: { create: driverIds.map((userId) => ({ userId })) },
      },
      include: teamInclude,
    });

    res.status(201).json({ data: team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = teamQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'date query parameter is required' });
    return;
  }

  const parsedDate = new Date(parsed.data.date);
  if (isNaN(parsedDate.getTime())) {
    res.status(400).json({ error: 'Invalid date format' });
    return;
  }

  try {
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const teams = await prisma.team.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
      include: teamInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  const { id } = req.params as { id: string };
  const { name, driverIds } = parsed.data;

  try {
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (driverIds !== undefined) {
      const drivers = await prisma.user.findMany({
        where: { id: { in: driverIds }, role: UserRole.Driver, isActive: true },
        select: { id: true },
      });
      if (drivers.length !== driverIds.length) {
        res.status(400).json({ error: 'One or more users are not valid drivers' });
        return;
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(driverIds !== undefined && {
          members: {
            deleteMany: {},
            create: driverIds.map((userId) => ({ userId })),
          },
        }),
      },
      include: teamInclude,
    });

    res.json({ data: team });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  try {
    const activeJobs = await prisma.job.count({
      where: {
        teamId: id,
        status: { in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS] },
        deletedAt: null,
      },
    });
    if (activeJobs > 0) {
      res.status(400).json({ error: 'Cannot delete team with active job assignments' });
      return;
    }

    await prisma.team.delete({ where: { id } });
    res.json({ data: { message: 'Team deleted successfully' } });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
