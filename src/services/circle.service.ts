import 'server-only';
import { prisma } from '@/lib/prisma';

export class CircleService {
  /**
   * Cria um círculo (grupo temporário, sem admin fixo)
   * - type: 'group', isEphemeral: true, defaultTTL: 86400 (24h default)
   * - Todos os membros têm role 'member' (sem admin)
   * - Qualquer membro pode adicionar/remover outros
   */
  async create(creatorId: string, name: string, memberIds: string[], ttl?: number) {
    const defaultTTL = ttl ?? 86400; // 24h default

    return prisma.conversation.create({
      data: {
        type: 'group',
        name,
        isEphemeral: true,
        defaultTTL,
        ownerId: creatorId,
        members: {
          create: [
            { userId: creatorId, role: 'member' },
            ...memberIds.map((id) => ({ userId: id, role: 'member' })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Adiciona membro (qualquer membro pode adicionar)
   */
  async addMember(circleId: string, userId: string, addedBy: string) {
    const circle = await prisma.conversation.findUnique({ where: { id: circleId } });
    if (!circle || !circle.isEphemeral) {
      throw new Error('Circle not found');
    }

    const isMember = await this.isMember(circleId, addedBy);
    if (!isMember) {
      throw new Error('Not a member of this circle');
    }

    const alreadyMember = await this.isMember(circleId, userId);
    if (alreadyMember) {
      throw new Error('User is already a member');
    }

    return prisma.conversationMember.create({
      data: { conversationId: circleId, userId, role: 'member' },
    });
  }

  /**
   * Remove membro (qualquer membro pode remover, ou auto-remoção)
   * Se for o último membro, deleta o círculo automaticamente
   */
  async removeMember(circleId: string, userId: string, removedBy: string) {
    const circle = await prisma.conversation.findUnique({ where: { id: circleId } });
    if (!circle || !circle.isEphemeral) {
      throw new Error('Circle not found');
    }

    if (userId !== removedBy) {
      const isMember = await this.isMember(circleId, removedBy);
      if (!isMember) {
        throw new Error('Not a member of this circle');
      }
    }

    await prisma.conversationMember.deleteMany({
      where: { conversationId: circleId, userId },
    });

    const remaining = await prisma.conversationMember.count({
      where: { conversationId: circleId },
    });

    if (remaining === 0) {
      await prisma.conversation.delete({ where: { id: circleId } });
      return { deleted: true };
    }

    return { deleted: false };
  }

  /**
   * Lista círculos do usuário (conversas com isEphemeral = true)
   */
  async getUserCircles(userId: string) {
    return prisma.conversation.findMany({
      where: {
        isEphemeral: true,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Verifica se usuário é membro
   */
  async isMember(circleId: string, userId: string): Promise<boolean> {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: circleId, userId },
      },
    });
    return member !== null;
  }

  /**
   * Prorroga TTL do círculo +7 dias a partir de agora
   */
  async extendTTL(circleId: string): Promise<void> {
    const circle = await prisma.conversation.findUnique({ where: { id: circleId } });
    if (!circle || !circle.isEphemeral) {
      throw new Error('Circle not found');
    }

    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    await prisma.conversation.update({
      where: { id: circleId },
      data: { defaultTTL: sevenDaysInSeconds },
    });
  }
}

export const circleService = new CircleService();
