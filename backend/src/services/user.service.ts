import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async createUser(data: { email: string; password: string; name?: string; role: 'Driver' | 'Dispatcher' }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      select: { id: true },
    });
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        name: data.name,
        role: data.role as UserRole,
        isActive: true,
      },
      select: safeUserSelect,
    });
  }

  async listUsers(roleFilter?: UserRole) {
    return this.prisma.user.findMany({
      where: roleFilter ? { role: roleFilter } : undefined,
      select: safeUserSelect,
      orderBy: { email: 'asc' },
    });
  }

  async updateUser(id: string, data: { email?: string; name?: string; role?: 'Driver' | 'Dispatcher'; isActive?: boolean }) {
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email.toLowerCase().trim(), NOT: { id } },
        select: { id: true },
      });
      if (existing) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role ? { role: data.role as UserRole } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: safeUserSelect,
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: safeUserSelect,
    });
  }
}
