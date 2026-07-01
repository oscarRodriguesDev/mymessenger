import type { User, Conversation, Message, ConversationMember } from '@prisma/client';

export type { User, Conversation, Message, ConversationMember };

export type MessageWithSender = Message & {
  sender: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl'>;
};

export type ConversationWithMembers = Conversation & {
  members: (ConversationMember & {
    user: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl'>;
  })[];
};

export type ConversationWithLastMessage = ConversationWithMembers & {
  messages: MessageWithSender[];
};

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type ConversationType = 'private' | 'group';

export type MemberRole = 'admin' | 'member';
