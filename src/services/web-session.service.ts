import { prisma } from '@/lib/prisma';
import type { WebSession } from '@prisma/client';

const WEB_SESSION_DAYS = 7; // Sessão web expira em 7 dias

export class WebSessionService {
  /**
   * Cria uma nova sessão web com validade de 7 dias
   */
  async createSession(userId: string, authId: string): Promise<WebSession> {
    // Remove sessão anterior se existir (evita duplicatas)
    await this.deleteByAuthId(authId);

    const expiresAt = new Date(Date.now() + WEB_SESSION_DAYS * 24 * 60 * 60 * 1000);

    return prisma.webSession.create({
      data: {
        userId,
        authId,
        expiresAt,
      },
    });
  }

  /**
   * Busca sessão ativa pelo authId
   */
  async findActiveByAuthId(authId: string): Promise<WebSession | null> {
    const session = await prisma.webSession.findUnique({
      where: { authId },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.deleteById(session.id);
      return null;
    }

    return session;
  }

  /**
   * Busca sessão ativa pelo userId
   */
  async findActiveByUserId(userId: string): Promise<WebSession | null> {
    const session = await prisma.webSession.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    return session;
  }

  /**
   * Verifica se o usuário tem uma sessão web válida
   */
  async hasValidSession(authId: string): Promise<boolean> {
    const session = await this.findActiveByAuthId(authId);
    return session !== null;
  }

  /**
   * Deleta sessão por authId
   */
  async deleteByAuthId(authId: string): Promise<void> {
    await prisma.webSession.deleteMany({
      where: { authId },
    });
  }

  /**
   * Deleta sessão por id
   */
  async deleteById(id: string): Promise<void> {
    await prisma.webSession.delete({ where: { id } }).catch(() => {});
  }

  /**
   * Remove todas as sessões expiradas
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.webSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

export const webSessionService = new WebSessionService();
