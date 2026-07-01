import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export class AuthService {
  /**
   * Sincroniza usuário do Supabase Auth com banco Prisma.
   * Se não existir, cria automaticamente.
   */
  async syncAuthUser(authUserId: string, email: string, metadata?: Record<string, unknown>): Promise<User> {
    // Buscar usuário existente
    const existingUser = await prisma.user.findUnique({
      where: { authId: authUserId },
    });

    if (existingUser) {
      // Atualizar lastSeen
      return prisma.user.update({
        where: { id: existingUser.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // Criar novo usuário
    const username = (metadata?.username as string) || email.split('@')[0];
    const fullName = (metadata?.full_name as string) || email;

    return prisma.user.create({
      data: {
        authId: authUserId,
        username,
        fullName,
        email,
      },
    });
  }

  /**
   * Busca usuário pelo authId do Supabase
   */
  async findByAuthId(authId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { authId } });
  }

  /**
   * Busca ou cria usuário baseado nos dados do Supabase Auth
   */
  async findOrCreate(authUserId: string, email: string, metadata?: Record<string, unknown>): Promise<User> {
    const user = await this.findByAuthId(authUserId);

    if (user) {
      return user;
    }

    return this.syncAuthUser(authUserId, email, metadata);
  }
}

export const authService = new AuthService();
