import { prisma } from '@/lib/prisma';
import type { Conversation, ConversationMember, Prisma } from '@prisma/client';

export class ConversationService {
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({ where: { id } });
  }

  async findUserConversations(userId: string) {
    return prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
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

  async createPrivateConversation(user1Id: string, user2Id: string) {
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'private',
        AND: [
          { members: { some: { userId: user1Id } } },
          { members: { some: { userId: user2Id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.conversation.create({
      data: {
        type: 'private',
        members: {
          create: [
            { userId: user1Id, role: 'member' },
            { userId: user2Id, role: 'member' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async createGroupConversation(
    creatorId: string,
    name: string,
    memberIds: string[]
  ): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        type: 'group',
        name,
        ownerId: creatorId,
        members: {
          create: [
            { userId: creatorId, role: 'admin' },
            ...memberIds.map((id) => ({ userId: id, role: 'member' })),
          ],
        },
      },
      include: { members: true },
    });
  }

  async addMember(
    conversationId: string,
    userId: string,
    role: string = 'member'
  ): Promise<ConversationMember> {
    return prisma.conversationMember.create({
      data: { conversationId, userId, role },
    });
  }

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await prisma.conversationMember.deleteMany({
      where: { conversationId, userId },
    });
  }

  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    return member !== null;
  }

  async getMembers(conversationId: string) {
    return prisma.conversationMember.findMany({
      where: { conversationId },
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
    });
  }

  async update(
    id: string,
    data: Prisma.ConversationUpdateInput
  ): Promise<Conversation> {
    return prisma.conversation.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Conversation> {
    return prisma.conversation.delete({ where: { id } });
  }
}

export const conversationService = new ConversationService();
