import { PrismaClient, JobStatus, JobType, UserRole, Prisma } from '@prisma/client';
import { CreateJobRequest, UpdateJobRequest, JobQuery, JobWithDetails } from '../types/job.types';

const userSelect = {
  select: { id: true, name: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const jobInclude = {
  include: {
    createdBy: userSelect,
    assignedDriver: userSelect,
    completionReport: true,
    customer: true,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformJob(job: any): JobWithDetails {
    let parsedServices: string[] | null = null;
    if (job.services && typeof job.services === 'string') {
      try {
        parsedServices = JSON.parse(job.services);
      } catch (error) {
        console.error('Error parsing services JSON:', error);
        parsedServices = null;
      }
    } else if (Array.isArray(job.services)) {
      parsedServices = job.services;
    }
    return {
      ...job,
      services: parsedServices,
    };
  }

  private async validateCustomer(customerId: string): Promise<void> {
    const exists = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!exists) throw new Error('CUSTOMER_NOT_FOUND');
  }

  async createJob(data: CreateJobRequest, createdById: string): Promise<JobWithDetails> {
    if (data.customerId) {
      await this.validateCustomer(data.customerId);
    }

    const { services, jobType, ...restData } = data;
    const job = await this.prisma.job.create({
      data: {
        ...restData,
        jobType: jobType as JobType,
        createdById,
        services: services ? JSON.stringify(services) : null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        scheduledStart: data.scheduledStart != null ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd != null ? new Date(data.scheduledEnd) : undefined,
        teamId: data.teamId ?? undefined,
      },
      ...jobInclude,
    });
    return this.transformJob(job);
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
      jobs: jobs.map((j) => this.transformJob(j)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getMyJobs(userId: string): Promise<JobWithDetails[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const jobs = await this.prisma.job.findMany({
      where: {
        deletedAt: null,
        OR: [
          { assignedDriverId: userId },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
      ...jobInclude,
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'desc' }],
    });
    return jobs.map((j) => this.transformJob(j));
  }

  async getJobById(id: string, userRole: UserRole, userId: string): Promise<JobWithDetails | null> {
    const job = await this.prisma.job.findFirst({
      where: { id, ...this.baseWhere(userRole, userId) },
      ...jobInclude,
    });
    return job ? this.transformJob(job) : null;
  }

  async updateJob(id: string, data: UpdateJobRequest, userRole: UserRole, userId: string): Promise<JobWithDetails | null> {
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

    if (data.customerId) {
      await this.validateCustomer(data.customerId);
    }

    const { services, jobType, ...restData } = data;

    const job = await this.prisma.job.update({
      where: { id },
      data: {
        ...restData,
        ...(jobType !== undefined ? { jobType: jobType as JobType } : {}),
        services: services !== undefined ? (services ? JSON.stringify(services) : null) : undefined,
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

    return this.transformJob(job);
  }

  async updateDriverNotes(id: string, driverNotes: string, userId: string): Promise<JobWithDetails | null> {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: { team: { include: { members: true } } },
    });
    if (!job) return null;

    const isDirectlyAssigned = job.assignedDriverId === userId;
    const isTeamMember = job.team !== null && job.team.members.some((m) => m.userId === userId);
    if (!isDirectlyAssigned && !isTeamMember) throw new Error('FORBIDDEN');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { driverNotes },
      ...jobInclude,
    });
    return this.transformJob(updated);
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
