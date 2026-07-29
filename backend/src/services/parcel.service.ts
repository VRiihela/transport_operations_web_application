import { Prisma, PrismaClient } from '@prisma/client';
import { CreateParcelRequest, UpdateParcelRequest } from '../types/parcel.types';

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export class ParcelService {
  constructor(private prisma: PrismaClient) {}

  async create(jobId: string, data: CreateParcelRequest) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      select: { id: true },
    });
    if (!job) throw new Error('JOB_NOT_FOUND');

    return this.prisma.parcel.create({
      data: {
        jobId,
        description: data.description,
        quantity: data.quantity,
      },
    });
  }

  async update(jobId: string, parcelId: string, data: UpdateParcelRequest) {
    try {
      return await this.prisma.parcel.update({
        where: { id: parcelId, jobId },
        data: {
          ...(data.description !== undefined && { description: data.description }),
          ...(data.quantity !== undefined && { quantity: data.quantity }),
        },
      });
    } catch (error) {
      if (isRecordNotFound(error)) throw new Error('PARCEL_NOT_FOUND');
      throw error;
    }
  }

  async remove(jobId: string, parcelId: string) {
    try {
      return await this.prisma.parcel.delete({
        where: { id: parcelId, jobId },
      });
    } catch (error) {
      if (isRecordNotFound(error)) throw new Error('PARCEL_NOT_FOUND');
      throw error;
    }
  }
}
