import { PrismaClient, UserRole, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { UpsertCompletionReportRequest } from '../types/completion-report.types';

const pdfJobInclude = {
  include: {
    completionReport: true,
    team: { include: { members: { select: { userId: true } } } },
  },
} satisfies Prisma.JobDefaultArgs;

export type JobForCompletionReportPdf = Prisma.JobGetPayload<typeof pdfJobInclude>;

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function formatTimeRange(start: Date, end: Date): string {
  const sameDay =
    start.toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' }) ===
    end.toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
  const endPart = sameDay ? formatTime(end) : formatDateTime(end);
  return `${formatDateTime(start)} – ${endPart}`;
}

function formatPickupAddress(job: JobForCompletionReportPdf): string {
  if (job.street) {
    const streetPart = [job.street, job.houseNumber, job.stair].filter(Boolean).join(' ');
    const cityPart = [job.postalCode, job.city].filter(Boolean).join(' ');
    return [streetPart, cityPart].filter(Boolean).join(', ');
  }
  return job.location ?? '';
}

function decodeSignature(dataUrl: string): Buffer | null {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[1] as string, 'base64');
}

export class CompletionReportService {
  constructor(private prisma: PrismaClient) {}

  async canModify(userId: string, userRole: UserRole, jobId: string): Promise<boolean> {
    if (userRole === UserRole.Admin || userRole === UserRole.Dispatcher) return true;
    if (userRole === UserRole.Driver) {
      const job = await this.prisma.job.findFirst({
        where: { id: jobId, deletedAt: null },
        select: { assignedDriverId: true, team: { include: { members: { select: { userId: true } } } } },
      });
      return job?.assignedDriverId === userId || (job?.team?.members.some((m) => m.userId === userId) ?? false);
    }
    return false;
  }

  async upsert(jobId: string, userId: string, data: UpsertCompletionReportRequest) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      include: { completionReport: { select: { approvedAt: true } } },
    });
    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.completionReport?.approvedAt) throw new Error('REPORT_LOCKED');

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
    if (report.approvedAt) throw new Error('ALREADY_APPROVED');
    if (!report.customerSignature) throw new Error('SIGNATURE_REQUIRED');

    return this.prisma.completionReport.update({
      where: { jobId },
      data: { approvedAt: new Date() },
    });
  }

  async unlock(jobId: string) {
    const report = await this.prisma.completionReport.findUnique({ where: { jobId } });
    if (!report) throw new Error('REPORT_NOT_FOUND');

    return this.prisma.completionReport.update({
      where: { jobId },
      data: { approvedAt: null },
    });
  }

  async getJobForPdf(jobId: string): Promise<JobForCompletionReportPdf | null> {
    return this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      ...pdfJobInclude,
    });
  }

  generatePdf(job: JobForCompletionReportPdf): PDFKit.PDFDocument {
    const report = job.completionReport;
    if (!report) throw new Error('REPORT_NOT_FOUND');

    const doc = new PDFDocument({ margin: 50 });

    // Logo placeholder
    doc.rect(50, 45, 80, 40).stroke('#d1d5db');
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text('LOGO', 50, 62, { width: 80, align: 'center' })
      .fillColor('#000');

    doc.fontSize(18).text('Completion Report', 150, 50);
    doc.fontSize(10).fillColor('#6b7280').text('FleetFlow', 150, 72).fillColor('#000');

    doc.moveDown(3);

    doc.fontSize(14).text(job.title);
    doc.fontSize(9).fillColor('#6b7280').text(`Job ID: ${job.id}`).fillColor('#000');
    doc.moveDown(0.5);

    if (job.scheduledStart) {
      const scheduling = job.scheduledEnd
        ? formatTimeRange(job.scheduledStart, job.scheduledEnd)
        : formatDateTime(job.scheduledStart);
      doc.fontSize(10).text(`Scheduled: ${scheduling}`);
    }

    const pickupAddress = formatPickupAddress(job);
    if (pickupAddress) {
      doc.fontSize(10).text(`Pickup address: ${pickupAddress}`);
    }

    doc.moveDown();
    doc.fontSize(12).text('Work performed', { underline: true });
    doc.fontSize(10).text(report.workDescription);

    doc.moveDown();
    doc.fontSize(12).text('Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Actual time: ${formatTimeRange(report.actualStart, report.actualEnd)}`);
    doc.text(`Total hours: ${report.totalHours.toFixed(2)} h`);
    doc.text(`Customer: ${report.customerName}`);
    if (report.approvedAt) {
      doc.text(`Approved: ${formatDateTime(report.approvedAt)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text('Customer signature', { underline: true });
    doc.moveDown(0.5);
    const signature = decodeSignature(report.customerSignature);
    if (signature) {
      doc.image(signature, { fit: [220, 110] });
    } else {
      doc.fontSize(10).fillColor('#6b7280').text('(signature unavailable)').fillColor('#000');
    }

    return doc;
  }
}
