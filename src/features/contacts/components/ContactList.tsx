'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';

interface ContactUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface ContactListProps {
  type: 'friends' | 'followers' | 'following' | 'pending';
  onStartConversation?: (userId: string) => void;
}

interface FollowItem {
  contact?: ContactUser;
  user?: ContactUser;
}

export function ContactList({ type, onStartConversation }: ContactListProps) {
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/follows/list?type=${type}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: FollowItem[]) => {
        if (!cancelled) {
          setContacts(data.map((item) => item.contact || item.user!));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Erro ao carregar contatos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type]);

  const handleAccept = async (userId: string) => {
    try {
      await fetch(`/api/follows/requests/${userId}`, {
        method: 'POST',
      });
      // Refetch after action
      const res = await fetch(`/api/follows/list?type=${type}`);
      if (res.ok) {
        const data: FollowItem[] = await res.json();
        setContacts(data.map((item) => item.contact || item.user!));
      }
    } catch {
      setError('Erro ao aceitar');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await fetch(`/api/follows/requests/${userId}`, {
        method: 'DELETE',
      });
      // Refetch after action
      const res = await fetch(`/api/follows/list?type=${type}`);
      if (res.ok) {
        const data: FollowItem[] = await res.json();
        setContacts(data.map((item) => item.contact || item.user!));
      }
    } catch {
      setError('Erro ao rejeitar');
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      // Refetch after action
      const res = await fetch(`/api/follows/list?type=${type}`);
      if (res.ok) {
        const data: FollowItem[] = await res.json();
        setContacts(data.map((item) => item.contact || item.user!));
      }
    } catch {
      setError('Erro ao deixar de seguir');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-sm text-destructive py-4">{error}</p>
    );
  }

  if (contacts.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-4">
        {type === 'friends' && 'Nenhum amigo ainda'}
        {type === 'followers' && 'Nenhum seguidor ainda'}
        {type === 'following' && 'Não segue ninguém ainda'}
        {type === 'pending' && 'Nenhuma solicitação pendente'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={contact.avatarUrl}
              alt={contact.fullName}
              size="md"
            />
            <div>
              <p className="font-medium">{contact.fullName}</p>
              <p className="text-sm text-muted-foreground">@{contact.username}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {type === 'pending' && (
              <>
                <button
                  onClick={() => handleAccept(contact.id)}
                  className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => handleReject(contact.id)}
                  className="rounded-md bg-secondary px-3 py-1 text-sm text-muted-foreground hover:bg-secondary/80"
                >
                  Rejeitar
                </button>
              </>
            )}
            {type === 'friends' && (
              <button
                onClick={() => onStartConversation?.(contact.id)}
                className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
              >
                Mensagem
              </button>
            )}
            {type === 'following' && (
              <button
                onClick={() => handleUnfollow(contact.id)}
                className="rounded-md bg-secondary px-3 py-1 text-sm text-muted-foreground hover:bg-secondary/80"
              >
                Deixar de seguir
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
