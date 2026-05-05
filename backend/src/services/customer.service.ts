import { PrismaClient } from '@prisma/client';
import { CreateCustomerData, CustomerSearchQuery } from '../types/customer.types';

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  type: true,
  companyName: true,
  referenceNumber: true,
  createdAt: true,
} as const;

const customerSearchSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  type: true,
  companyName: true,
} as const;

export class CustomerService {
  constructor(private prisma: PrismaClient) {}

  async searchByPhone(query: CustomerSearchQuery) {
    return this.prisma.customer.findMany({
      where: {
        phone: { contains: query.phone, mode: 'insensitive' },
      },
      select: customerSearchSelect,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateCustomerData) {
    return this.prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        type: data.type,
        companyName: data.companyName ?? null,
        referenceNumber: data.referenceNumber ?? null,
      },
      select: customerSelect,
    });
  }

  async getById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      select: customerSelect,
    });
  }
}
