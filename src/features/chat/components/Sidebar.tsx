'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

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
}

interface SidebarProps {
  currentUserId: string;
  onSelectConversation: (id: string) => void;
  selectedConversationId: string | null;
}

export function Sidebar({ currentUserId, onSelectConversation, selectedConversationId }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/conversations')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (!cancelled) setConversations(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherMember = conv.members.find(m => m.id !== currentUserId);
    return otherMember?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.avatarUrl) return conv.avatarUrl;
    const otherMember = conv.members.find(m => m.id !== currentUserId);
    return otherMember?.avatarUrl;
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full w-full md:w-80 flex-col border-r border-border bg-card">
      <div className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Chats</h2>
        <Input
          id="search"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary ${
                selectedConversationId === conv.id ? 'bg-secondary' : ''
              }`}
            >
              <Avatar
                src={getConversationAvatar(conv)}
                fallback={getConversationName(conv)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">
                    {getConversationName(conv)}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage.sender}: {conv.lastMessage.text}
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
