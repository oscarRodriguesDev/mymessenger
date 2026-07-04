import 'server-only';
import { prisma } from '@/lib/prisma';
import type { VibeSignal } from '@prisma/client';

export class VibeService {
  /**
   * Envia um sinal "vibe" para outro usuário.
   * Retorna o sinal criado.
   */
  async sendSignal(
    senderId: string,
    receiverId: string,
    type: string,
    conversationId?: string
  ): Promise<VibeSignal> {
    return prisma.vibeSignal.create({
      data: {
        senderId,
        receiverId,
        type,
        conversationId: conversationId || null,
      },
    });
  }

  /**
   * Busca sinais não lidos do usuário (últimos 10).
   * Inclui dados do remetente (id, username, fullName, avatarUrl).
   */
  async getPendingSignals(userId: string): Promise<VibeSignal[]> {
    return prisma.vibeSignal.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Marca um sinal como lido (deleta o registro).
   * Apenas o receptor pode acknowledge.
   */
  async acknowledgeSignal(signalId: string, userId: string): Promise<void> {
    const signal = await prisma.vibeSignal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      throw new Error('Signal not found');
    }

    if (signal.receiverId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.vibeSignal.delete({ where: { id: signalId } });
  }

  /**
   * Verifica se o remetente está bloqueado pelo receptor.
   */
  async isBlocked(senderId: string, receiverId: string): Promise<boolean> {
    const block = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedUserId: { userId: receiverId, blockedUserId: senderId },
      },
    });
    return !!block;
  }

  /**
   * Cria uma mensagem de sistema na conversa informando que o usuário vibrou.
   */
  async createSystemMessage(
    conversationId: string,
    senderId: string,
    type: string
  ): Promise<void> {
    const vibeLabel = this.getVibeLabel(type);
    await prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: 'system',
        text: `Enviou um sinal ${vibeLabel}`,
      },
    });

    // Atualizar updatedAt da conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private getVibeLabel(type: string): string {
    const labels: Record<string, string> = {
      buzz: 'Buzz 👋',
      poke: 'Poke 🤏',
      wave: 'Wave 🖐️',
      heartbeat: 'Heartbeat 💓',
      fire: 'Fire 🔥',
    };
    return labels[type] || type;
  }
}

export const vibeService = new VibeService();
