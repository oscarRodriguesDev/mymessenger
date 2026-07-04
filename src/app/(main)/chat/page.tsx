'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { ChatArea } from '@/features/chat/components/ChatArea';
import { usePresence } from '@/hooks/usePresence';
import { CircleBadge } from '@/features/groups/CircleBadge';

interface Member {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

interface LastMessage {
  text: string | null;
  sender: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: string;
  name: string | null;
  avatarUrl: string | null;
  lastMessage: LastMessage | null;
  members: Member[];
  updatedAt: string;
  isEphemeral?: boolean;
  defaultTTL?: number | null;
}

export default function ChatPage() {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Presença: monitorar participantes das conversas
  const watchedIds = conversations.flatMap((conv) =>
    conv.members.filter((m) => m.id !== profile?.id).map((m) => m.id)
  );
  const { isOnline } = usePresence({ watchUserIds: watchedIds });

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile) return;

    let cancelled = false;
    fetch('/api/conversations')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (!cancelled) setConversations(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingConversations(false); });
    return () => { cancelled = true; };
  }, [profile]);

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherMember = conv.members.find(m => m.id !== profile?.id);
    return otherMember?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.avatarUrl) return conv.avatarUrl;
    const otherMember = conv.members.find(m => m.id !== profile?.id);
    return otherMember?.avatarUrl;
  };

  // Para conversas 1:1, pegar o status do outro participante
  const getOtherMemberStatus = (conv: Conversation) => {
    if (conv.type === 'group') return undefined;
    const other = conv.members.find(m => m.id !== profile?.id);
    if (!other) return undefined;
    return isOnline(other.id) ? 'online' as const : 'offline' as const;
  };

  // Status do outro usuário na conversa selecionada (para o header)
  const selectedConversation = selectedConversationId
    ? conversations.find(c => c.id === selectedConversationId)
    : null;
  const otherMemberStatus = selectedConversation && selectedConversation.type !== 'group'
    ? getOtherMemberStatus(selectedConversation)
    : undefined;

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  // If a conversation is selected, show chat view
  if (selectedConversationId) {
    const conversationName = selectedConversation ? getConversationName(selectedConversation) : 'Chat';

    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:p-4">
          <button
            onClick={() => setSelectedConversationId(null)}
            className="shrink-0 rounded-md p-1.5 hover:bg-secondary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar
            src={selectedConversation?.avatarUrl}
            fallback={conversationName}
            size="sm"
            className="h-10 w-10"
            showStatus={selectedConversation?.type !== 'group'}
            status={otherMemberStatus}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold truncate sm:text-lg">{conversationName}</h1>
              {/* #17: Badge de círculo */}
              {selectedConversation?.isEphemeral && selectedConversation.defaultTTL && (
                <CircleBadge
                  createdAt={selectedConversation.updatedAt}
                  defaultTTL={selectedConversation.defaultTTL}
                />
              )}
            </div>
            {otherMemberStatus && (
              <p className="text-xs text-muted-foreground">
                {otherMemberStatus === 'online' ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </header>
        <ChatArea
          conversationId={selectedConversationId}
          currentUserId={profile.id}
          members={selectedConversation?.members ?? []}
          typingIndicatorEnabled={profile.typingIndicatorEnabled}
        />
      </div>
    );
  }

  // Conversations list view
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:p-4">
        <h1 className="text-lg font-semibold">Mensagens</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/contacts')}
            title="Nova conversa"
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={signOut}
            title="Sair"
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="p-3 sm:p-4">
        <input
          type="text"
          placeholder="Buscar conversas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {loadingConversations ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
          </div>
        ) : (
          filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversationId(conv.id)}
              className="flex w-full items-center gap-3 border-b border-border/50 p-3 text-left transition-colors hover:bg-secondary/30 sm:p-4"
            >
              <Avatar
                src={getConversationAvatar(conv)}
                fallback={getConversationName(conv)}
                size="sm"
                className="h-12 w-12"
                showStatus={conv.type !== 'group'}
                status={getOtherMemberStatus(conv)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate text-sm sm:text-base">
                    {getConversationName(conv)}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate sm:text-sm">
                    <span className="font-medium">{conv.lastMessage.sender}:</span> {conv.lastMessage.text}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
