import { prisma } from '@/lib/prisma';
import type { User, Prisma } from '@prisma/client';

export class UserService {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByAuthId(authId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { authId } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }

  async upsertByAuthId(
    authId: string,
    createData: Prisma.UserCreateInput,
    updateData?: Prisma.UserUpdateInput
  ): Promise<User> {
    return prisma.user.upsert({
      where: { authId },
      create: createData,
      update: updateData ?? {},
    });
  }

  async searchByUsername(query: string, excludeUserId?: string) {
    return prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      take: 20,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return prisma.user.findMany({
      where: { id: { in: ids } },
    });
  }

  async updateLastSeen(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }
}

export const userService = new UserService();
