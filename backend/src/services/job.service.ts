import { PrismaClient, JobStatus, UserRole, Prisma } from '@prisma/client';
import { CreateJobRequest, UpdateJobRequest, JobQuery } from '../types/job.types';

const userSelect = {
  select: { id: true, name: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const jobInclude = {
  include: {
    createdBy: userSelect,
    assignedDriver: userSelect,
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
      where.assignedDriverId = userId;
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
      },
      ...jobInclude,
    });
  }

  async getJobs(query: JobQuery, userRole: UserRole, userId: string) {
    const { status, assignedDriverId, page = 1, limit = 10 } = query;

    const where: Prisma.JobWhereInput = {
      ...this.baseWhere(userRole, userId),
      ...(status && { status }),
      ...(assignedDriverId && userRole !== UserRole.Driver && { assignedDriverId }),
    };

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
        status: data.status as JobStatus | undefined,
      },
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
