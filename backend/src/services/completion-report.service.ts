import { PrismaClient, UserRole } from '@prisma/client';
import { UpsertCompletionReportRequest } from '../types/completion-report.types';

export class CompletionReportService {
  constructor(private prisma: PrismaClient) {}

  async canModify(userId: string, userRole: UserRole, jobId: string): Promise<boolean> {
    if (userRole === UserRole.Admin || userRole === UserRole.Dispatcher) return true;
    if (userRole === UserRole.Driver) {
      const job = await this.prisma.job.findFirst({
        where: { id: jobId, deletedAt: null },
        select: { assignedDriverId: true },
      });
      return job?.assignedDriverId === userId;
    }
    return false;
  }

  async upsert(jobId: string, userId: string, data: UpsertCompletionReportRequest) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
    if (!job) throw new Error('JOB_NOT_FOUND');

    const actualStart = new Date(data.actualStart);
    const actualEnd = new Date(data.actualEnd);
    const totalHours =
      Math.round((Math.abs(actualEnd.getTime() - actualStart.getTime()) / 36e5) * 100) / 100;

    return this.prisma.completionReport.upsert({
      where: { jobId },
      create: {
        jobId,
        workDescription: data.workDescription,
        actualStart,
        actualEnd,
        totalHours,
        customerName: data.customerName,
        customerSignature: data.customerSignature,
        createdById: userId,
      },
      update: {
        workDescription: data.workDescription,
        actualStart,
        actualEnd,
        totalHours,
        customerName: data.customerName,
        customerSignature: data.customerSignature,
        approvedAt: null, // reset approval on update
      },
    });
  }

  async approve(jobId: string) {
    const report = await this.prisma.completionReport.findUnique({ where: { jobId } });
    if (!report) throw new Error('REPORT_NOT_FOUND');
    if (!report.customerSignature) throw new Error('SIGNATURE_REQUIRED');

    return this.prisma.completionReport.update({
      where: { jobId },
      data: { approvedAt: new Date() },
    });
  }
}
