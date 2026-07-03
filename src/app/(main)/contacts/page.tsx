'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { UserSearch } from '@/features/contacts/components/UserSearch';
import { ContactList } from '@/features/contacts/components/ContactList';
import { CreateGroupModal } from '@/features/groups/CreateGroupModal';

type Tab = 'search' | 'friends' | 'followers' | 'following' | 'pending';

const tabs: { id: Tab; label: string }[] = [
  { id: 'search', label: 'Buscar' },
  { id: 'friends', label: 'Amigos' },
  { id: 'followers', label: 'Seguidores' },
  { id: 'following', label: 'Seguindo' },
  { id: 'pending', label: 'Pendentes' },
];

export default function ContactsPage() {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const startConversation = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: userId }),
      });
      if (res.ok) {
        router.push('/chat');
      }
    } catch {
      // Silently fail
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:p-4">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="shrink-0 rounded-md p-1.5 hover:bg-secondary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold truncate">Contatos</h1>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="ml-auto mr-2 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Criar grupo"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              <circle cx="18" cy="6" r="3" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:gap-4">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {profile.username}
          </span>
          <button
            onClick={signOut}
            title="Sair"
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="overflow-x-auto border-b border-border bg-card/50">
        <div className="flex gap-1 p-2 sm:gap-0 sm:p-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:flex-1 sm:rounded-none sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground sm:border-b-2 sm:border-primary sm:bg-transparent sm:text-primary'
                  : 'text-muted-foreground hover:bg-secondary sm:hover:bg-secondary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {activeTab === 'search' && (
          <UserSearch
            onSelectUser={startConversation}
          />
        )}
        {activeTab === 'friends' && (
          <ContactList
            type="friends"
            onStartConversation={startConversation}
          />
        )}
        {activeTab === 'followers' && (
          <ContactList type="followers" />
        )}
        {activeTab === 'following' && (
          <ContactList type="following" />
        )}
        {activeTab === 'pending' && (
          <ContactList type="pending" />
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </div>
  );
}
