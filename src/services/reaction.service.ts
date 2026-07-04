import { prisma } from '@/lib/prisma';
import type { Reaction } from '@prisma/client';

export class ReactionService {
  async toggle(messageId: string, userId: string, emoji: string): Promise<{ added: boolean; reaction?: Reaction }> {
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { added: false };
    }

    const reaction = await prisma.reaction.create({
      data: { messageId, userId, emoji },
      include: {
        user: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    return { added: true, reaction };
  }

  async getReactions(messageId: string) {
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: { id: true, username: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupa por emoji: { emoji: count, users: [...] }
    const grouped: Record<string, { count: number; users: { id: string; username: string; fullName: string }[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push({
        id: r.user.id,
        username: r.user.username,
        fullName: r.user.fullName,
      });
    }

    return grouped;
  }

  async getMessagesReactions(messageIds: string[]) {
    const reactions = await prisma.reaction.findMany({
      where: { messageId: { in: messageIds } },
      select: { messageId: true, emoji: true, userId: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupa por messageId → { emoji: count }
    const result: Record<string, Record<string, number>> = {};
    for (const r of reactions) {
      if (!result[r.messageId]) {
        result[r.messageId] = {};
      }
      result[r.messageId][r.emoji] = (result[r.messageId][r.emoji] || 0) + 1;
    }

    return result;
  }
}

export const reactionService = new ReactionService();