import { PrismaClient, JobStatus, UserRole, Prisma } from '@prisma/client';
import { CreateJobRequest, UpdateJobRequest, JobQuery } from '../types/job.types';

const userSelect = {
  select: { id: true, name: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const jobInclude = {
  include: {
    createdBy: userSelect,
    assignedDriver: userSelect,
    completionReport: true,
    team: {
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    },
  },
} satisfies Prisma.JobDefaultArgs;

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.ASSIGNED],
  [JobStatus.ASSIGNED]: [JobStatus.DRAFT, JobStatus.IN_PROGRESS],
  [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED],
  [JobStatus.COMPLETED]: [],
};

export class JobService {
  constructor(private prisma: PrismaClient) {}

  private baseWhere(userRole: UserRole, userId: string): Prisma.JobWhereInput {
    const where: Prisma.JobWhereInput = { deletedAt: null };
    if (userRole === UserRole.Driver) {
      where.OR = [
        { assignedDriverId: userId },
        { team: { members: { some: { userId } } } },
      ];
    }
    return where;
  }

  private assertValidTransition(current: JobStatus, next: JobStatus): void {
    if (!VALID_TRANSITIONS[current].includes(next)) {
      throw new Error(`Invalid status transition from ${current} to ${next}`);
    }
  }

  async createJob(data: CreateJobRequest, createdById: string) {
    return this.prisma.job.create({
      data: {
        ...data,
        createdById,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        scheduledStart: data.scheduledStart != null ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd != null ? new Date(data.scheduledEnd) : undefined,
        teamId: data.teamId ?? undefined,
      },
      ...jobInclude,
    });
  }

  async getJobs(query: JobQuery, userRole: UserRole, userId: string) {
    const { status, assignedDriverId, scheduledFrom, scheduledTo, page = 1, limit = 10 } = query;

    let where: Prisma.JobWhereInput;

    if (userRole === UserRole.Driver && (scheduledFrom || scheduledTo)) {
      const dateFilter = {
        ...(scheduledFrom && { gte: new Date(scheduledFrom) }),
        ...(scheduledTo && { lte: new Date(scheduledTo) }),
      };
      where = {
        deletedAt: null,
        ...(status && { status }),
        OR: [
          { assignedDriverId: userId, scheduledStart: dateFilter },
          { team: { members: { some: { userId } }, date: dateFilter } },
        ],
      };
    } else {
      where = {
        ...this.baseWhere(userRole, userId),
        ...(status && { status }),
        ...(assignedDriverId && userRole !== UserRole.Driver && { assignedDriverId }),
        ...((scheduledFrom || scheduledTo) && {
          scheduledStart: {
            ...(scheduledFrom && { gte: new Date(scheduledFrom) }),
            ...(scheduledTo && { lte: new Date(scheduledTo) }),
          },
        }),
      };
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        ...jobInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getJobById(id: string, userRole: UserRole, userId: string) {
    return this.prisma.job.findFirst({
      where: { id, ...this.baseWhere(userRole, userId) },
      ...jobInclude,
    });
  }

  async updateJob(id: string, data: UpdateJobRequest, userRole: UserRole, userId: string) {
    const existing = await this.getJobById(id, userRole, userId);
    if (!existing) return null;

    if (data.status && data.status !== existing.status) {
      this.assertValidTransition(existing.status, data.status as JobStatus);

      if (data.status === JobStatus.COMPLETED) {
        const report = await this.prisma.completionReport.findUnique({
          where: { jobId: id },
          select: { approvedAt: true },
        });
        if (!report?.approvedAt) {
          throw new Error('COMPLETION_REPORT_REQUIRED');
        }
      }
    }

    // Merge scheduling fields and validate the resulting state
    const mergedStart = data.scheduledStart !== undefined
      ? data.scheduledStart
      : (existing.scheduledStart?.toISOString() ?? null);
    const mergedEnd = data.scheduledEnd !== undefined
      ? data.scheduledEnd
      : (existing.scheduledEnd?.toISOString() ?? null);
    const mergedNote = data.schedulingNote !== undefined ? data.schedulingNote : existing.schedulingNote;

    if (!mergedStart && !mergedEnd && !mergedNote?.trim()) {
      throw new Error('SCHEDULING_NOTE_REQUIRED');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        ...data,
        scheduledAt:
          data.scheduledAt !== undefined
            ? data.scheduledAt
              ? new Date(data.scheduledAt)
              : null
            : undefined,
        scheduledStart:
          data.scheduledStart !== undefined
            ? data.scheduledStart
              ? new Date(data.scheduledStart)
              : null
            : undefined,
        scheduledEnd:
          data.scheduledEnd !== undefined
            ? data.scheduledEnd
              ? new Date(data.scheduledEnd)
              : null
            : undefined,
        status: data.status as JobStatus | undefined,
        teamId: data.teamId !== undefined ? data.teamId : undefined,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      },
      ...jobInclude,
    });
  }

  async updateDriverNotes(id: string, driverNotes: string, userId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: { team: { include: { members: true } } },
    });
    if (!job) return null;

    const isDirectlyAssigned = job.assignedDriverId === userId;
    const isTeamMember = job.team !== null && job.team.members.some((m) => m.userId === userId);
    if (!isDirectlyAssigned && !isTeamMember) throw new Error('FORBIDDEN');

    return this.prisma.job.update({
      where: { id },
      data: { driverNotes },
      ...jobInclude,
    });
  }

  async deleteJob(id: string) {
    const existing = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
