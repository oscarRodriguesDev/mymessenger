'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';

interface User {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasPendingRequest: boolean;
  requestDirection: 'sent' | 'received' | null;
}

interface UserSearchProps {
  onSelectUser?: (userId: string) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef('');

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
    } catch {
      setError('Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      if (lastQueryRef.current.length >= 2) {
        setResults([]);
      }
      return;
    }

    lastQueryRef.current = query;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchUsers]);

  const handleFollow = async (userId: string) => {
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setResults(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, hasPendingRequest: true, requestDirection: 'sent' as const }
            : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao seguir');
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      setResults(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, isFollowing: false, isFollowedBy: false }
            : u
        )
      );
    } catch {
      setError('Erro ao deixar de seguir');
    }
  };

  const handleAccept = async (userId: string) => {
    try {
      await fetch(`/api/follows/requests/${userId}`, {
        method: 'POST',
      });

      setResults(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, isFollowing: true, isFollowedBy: true, hasPendingRequest: false, requestDirection: null }
            : u
        )
      );
    } catch {
      setError('Erro ao aceitar');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await fetch(`/api/follows/requests/${userId}`, {
        method: 'DELETE',
      });

      setResults(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, hasPendingRequest: false, requestDirection: null }
            : u
        )
      );
    } catch {
      setError('Erro ao rejeitar');
    }
  };

  const getFollowButton = (user: User) => {
    if (user.isFollowing) {
      return (
        <button
          onClick={() => handleUnfollow(user.id)}
          className="rounded-md bg-secondary px-3 py-1 text-sm text-muted-foreground hover:bg-secondary/80"
        >
          Seguindo
        </button>
      );
    }

    if (user.hasPendingRequest && user.requestDirection === 'received') {
      return (
        <div className="flex gap-1">
          <button
            onClick={() => handleAccept(user.id)}
            className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
          >
            Aceitar
          </button>
          <button
            onClick={() => handleReject(user.id)}
            className="rounded-md bg-secondary px-3 py-1 text-sm text-muted-foreground hover:bg-secondary/80"
          >
            Rejeitar
          </button>
        </div>
      );
    }

    if (user.hasPendingRequest && user.requestDirection === 'sent') {
      return (
        <span className="text-sm text-muted-foreground">Pendente</span>
      );
    }

    return (
      <button
        onClick={() => handleFollow(user.id)}
        className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
      >
        Seguir
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome ou usuário..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 pl-10 text-sm focus:border-primary focus:outline-none"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
            >
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => onSelectUser?.(user.id)}
              >
                <Avatar
                  src={user.avatarUrl}
                  alt={user.fullName}
                  size="md"
                />
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div>{getFollowButton(user)}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhum usuário encontrado
        </p>
      )}
    </div>
  );
}
