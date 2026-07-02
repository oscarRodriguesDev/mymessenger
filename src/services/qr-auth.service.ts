import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import type { QrAuthSession } from '@prisma/client';

const QR_EXPIRY_SECONDS = 120; // 2 minutos

export class QrAuthService {
  /**
   * Cria uma nova sessão QR com token único
   */
  async createSession(userAgent?: string): Promise<QrAuthSession> {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000);

    return prisma.qrAuthSession.create({
      data: {
        token,
        userAgent,
        expiresAt,
      },
    });
  }

  /**
   * Busca sessão pelo token
   */
  async findByToken(token: string): Promise<QrAuthSession | null> {
    return prisma.qrAuthSession.findUnique({ where: { token } });
  }

  /**
   * Marca sessão como expirada
   */
  async expireSession(id: string): Promise<void> {
    await prisma.qrAuthSession.update({
      where: { id },
      data: { status: 'expired' },
    });
  }

  /**
   * Confirma a sessão (chamado pelo mobile)
   */
  async confirmSession(token: string, userId: string, authId: string): Promise<QrAuthSession | null> {
    const session = await this.findByToken(token);

    if (!session) return null;
    if (session.status !== 'pending') return null;
    if (session.expiresAt < new Date()) {
      await this.expireSession(session.id);
      return null;
    }

    return prisma.qrAuthSession.update({
      where: { id: session.id },
      data: {
        userId,
        authId,
        status: 'confirmed',
      },
    });
  }

  /**
   * Limpa sessões expiradas (pode ser chamado periodicamente)
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.qrAuthSession.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    return result.count;
  }
}

export const qrAuthService = new QrAuthService();
