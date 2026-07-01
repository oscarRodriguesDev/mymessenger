import { prisma } from '@/lib/prisma';
import type { Message, Prisma } from '@prisma/client';

export class MessageService {
  async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({ where: { id } });
  }

  async findByConversationId(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId },
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
      take: limit,
      skip: offset,
    });
  }

  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    const message = await prisma.message.create({
      data,
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
    });

    // Atualizar updatedAt da conversa
    await prisma.conversation.update({
      where: { id: data.conversation.connect?.id ?? '' },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async updateStatus(
    id: string,
    status: 'sent' | 'delivered' | 'read'
  ): Promise<Message> {
    return prisma.message.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<Message> {
    return prisma.message.delete({ where: { id } });
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    // Criar registro de leitura se não existir
    await prisma.messageRead.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });

    // Atualizar status da mensagem para 'read'
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'read' },
    });
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        reads: {
          none: { userId },
        },
      },
    });
  }
}

export const messageService = new MessageService();
