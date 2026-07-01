import { prisma } from '@/lib/prisma';
import type { Contact } from '@prisma/client';

interface UserSearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface ContactWithUser extends Contact {
  contact: UserSearchResult;
}

interface FollowWithUser extends Contact {
  user: UserSearchResult;
}

export class FollowService {
  async searchUsers(query: string, currentUserId: string): Promise<UserSearchResult[]> {
    const blocked = await prisma.blockedUser.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { blockedUserId: currentUserId },
        ],
      },
      select: { userId: true, blockedUserId: true },
    });

    const blockedIds = blocked.map(b =>
      b.userId === currentUserId ? b.blockedUserId : b.userId
    );

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId, notIn: blockedIds },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
      },
      take: 20,
    });

    return users;
  }

  async follow(followerId: string, followingId: string): Promise<Contact> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      throw new Error('User not found');
    }

    const existing = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: followerId, contactId: followingId } },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Already following');
      }
      if (existing.status === 'pending') {
        throw new Error('Follow request already pending');
      }
    }

    if (existing) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { status: 'pending' },
      });
    }

    return prisma.contact.create({
      data: {
        userId: followerId,
        contactId: followingId,
        status: 'pending',
      },
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await prisma.contact.deleteMany({
      where: {
        userId: followerId,
        contactId: followingId,
      },
    });

    const reverse = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: followingId, contactId: followerId } },
    });

    if (reverse && reverse.status === 'accepted') {
      await prisma.contact.update({
        where: { id: reverse.id },
        data: { status: 'pending' },
      });
    }
  }

  async acceptRequest(userId: string, followerId: string): Promise<Contact> {
    const request = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: followerId, contactId: userId } },
    });

    if (!request || request.status !== 'pending') {
      throw new Error('Follow request not found');
    }

    const updated = await prisma.contact.update({
      where: { id: request.id },
      data: { status: 'accepted' },
    });

    const reverse = await prisma.contact.findUnique({
      where: { userId_contactId: { userId, contactId: followerId } },
    });

    if (!reverse) {
      await prisma.contact.create({
        data: {
          userId,
          contactId: followerId,
          status: 'accepted',
        },
      });
    } else if (reverse.status !== 'accepted') {
      await prisma.contact.update({
        where: { id: reverse.id },
        data: { status: 'accepted' },
      });
    }

    return updated;
  }

  async rejectRequest(userId: string, followerId: string): Promise<void> {
    await prisma.contact.deleteMany({
      where: {
        userId: followerId,
        contactId: userId,
        status: 'pending',
      },
    });
  }

  async getFriends(userId: string): Promise<ContactWithUser[]> {
    const outgoing = await prisma.contact.findMany({
      where: { userId, status: 'accepted' },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    const incoming = await prisma.contact.findMany({
      where: { contactId: userId, status: 'accepted' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    const friendsMap = new Map<string, ContactWithUser>();

    for (const out of outgoing) {
      friendsMap.set(out.contactId, out);
    }

    for (const inc of incoming) {
      if (!friendsMap.has(inc.userId)) {
        friendsMap.set(inc.userId, {
          ...inc,
          contact: inc.user,
        } as ContactWithUser);
      }
    }

    return Array.from(friendsMap.values());
  }

  async getFollowers(userId: string): Promise<FollowWithUser[]> {
    const followers = await prisma.contact.findMany({
      where: { contactId: userId, status: 'accepted' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    return followers as FollowWithUser[];
  }

  async getFollowing(userId: string): Promise<ContactWithUser[]> {
    const following = await prisma.contact.findMany({
      where: { userId, status: 'accepted' },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    return following as ContactWithUser[];
  }

  async getPendingRequests(userId: string): Promise<FollowWithUser[]> {
    const pending = await prisma.contact.findMany({
      where: { contactId: userId, status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    return pending as FollowWithUser[];
  }

  async getFollowStatus(currentUserId: string, targetUserId: string): Promise<{
    isFollowing: boolean;
    isFollowedBy: boolean;
    hasPendingRequest: boolean;
    requestDirection: 'sent' | 'received' | null;
  }> {
    const outgoing = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: currentUserId, contactId: targetUserId } },
    });

    const incoming = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: targetUserId, contactId: currentUserId } },
    });

    return {
      isFollowing: outgoing?.status === 'accepted',
      isFollowedBy: incoming?.status === 'accepted',
      hasPendingRequest: outgoing?.status === 'pending' || incoming?.status === 'pending',
      requestDirection: outgoing?.status === 'pending' ? 'sent' : incoming?.status === 'pending' ? 'received' : null,
    };
  }
}

export const followService = new FollowService();
