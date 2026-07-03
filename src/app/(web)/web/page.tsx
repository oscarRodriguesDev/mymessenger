'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { ChatArea } from '@/features/chat/components/ChatArea';
import { usePresence } from '@/hooks/usePresence';

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

export default function WebPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [webSessionValid, setWebSessionValid] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // ── Verificar autenticação e sessão web ──
  useEffect(() => {
    if (authLoading) return;

    // ── Magic link: o Supabase redireciona para /web#access_token=...
    // O hash fica no cliente e pode levar alguns ms para ser processado.
    // Se detectarmos que há um hash de acesso, esperamos o auth completar.
    const hasAuthHash =
      typeof window !== 'undefined' &&
      window.location.hash.includes('access_token=');

    if (!user || !profile) {
      if (hasAuthHash) {
        // Auth ainda está sendo processado via magic link — aguardar
        // O AuthProvider vai processar o hash e atualizar user/profile
        // Timeout de segurança: se não processar em 5s, redireciona
        const timeout = setTimeout(() => {
          router.replace('/web-access');
        }, 20000);
        return () => clearTimeout(timeout);
      }

      router.replace('/web-access'); /* onde redireciona para web aqui? */
      return;
    }

    // Verificar sessão web
    fetch('/api/web/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setWebSessionValid(true);
        } else {
          // Se não tem sessão web válida, redirecionar para /web-access
          router.replace('/web-access');
        }
      })
      .catch(() => {
        router.replace('/web-access');
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, [user, profile, authLoading, router]);

  // ── Carregar conversas ──
  useEffect(() => {
    if (!webSessionValid || !profile) return;

    let cancelled = false;
    fetch('/api/conversations')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setConversations(data);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [webSessionValid, profile]);

  // ── Sair da sessão web ──
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      // 1) Remove a WebSession do banco (apenas desktop)
      await fetch('/api/web/session', { method: 'DELETE' });

      // 2) Limpa a sessão LOCALMENTE (só este browser)
      //    scope:'local' NÃO revoga o refresh token no servidor,
      //    então o celular continua logado normalmente.
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // segue mesmo com erro
    }
    router.replace('/web-access');
  }, [router]);

  // ── Helpers ──
  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherMember = conv.members.find((m) => m.id !== profile?.id);
    return otherMember?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.avatarUrl) return conv.avatarUrl;
    const otherMember = conv.members.find((m) => m.id !== profile?.id);
    return otherMember?.avatarUrl;
  };

  // ── Presença ──
  const watchedIds = conversations.flatMap((conv) =>
    conv.members.filter((m) => m.id !== profile?.id).map((m) => m.id)
  );
  const { isOnline } = usePresence({ watchUserIds: watchedIds });

  const getOtherMemberStatus = (conv: Conversation) => {
    if (conv.type === 'group') return undefined;
    const other = conv.members.find((m) => m.id !== profile?.id);
    if (!other) return undefined;
    return isOnline(other.id) ? ('online' as const) : ('offline' as const);
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const conversationName = selectedConversation ? getConversationName(selectedConversation) : '';
  const otherMemberStatus = selectedConversation
    ? getOtherMemberStatus(selectedConversation)
    : undefined;

  // ── Loading inicial ──
  if (authLoading || checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // Se chegou aqui mas não tem sessão válida, não renderiza nada (redirecionamento já foi disparado)
  if (!webSessionValid || !profile) return null;

  // ════════════════════════════════════════════════════════════════
  // VIEW: Conversa selecionada
  // ════════════════════════════════════════════════════════════════
  if (selectedConversationId && selectedConversation) {
    return (
      <div className="flex h-full flex-col">
        {/* Header da conversa */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            onClick={() => setSelectedConversationId(null)}
            className="shrink-0 rounded-md p-1.5 hover:bg-secondary transition-colors lg:hidden"
            title="Voltar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar
            src={getConversationAvatar(selectedConversation)}
            fallback={conversationName}
            size="sm"
            className="h-10 w-10 shrink-0"
            showStatus={selectedConversation.type !== 'group'}
            status={otherMemberStatus}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">{conversationName}</h1>
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
          members={selectedConversation.members}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // VIEW: Lista de conversas (layout desktop two-panel)
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full">
      {/* Painel da lista de conversas */}
      <div className="flex w-full flex-col border-r border-border lg:max-w-[380px] xl:max-w-[420px]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold">Messenger Web</h1>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            title="Sair"
          >
            {signingOut ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        {/* Busca */}
        <div className="p-3">
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`flex w-full items-center gap-3 border-b border-border/50 p-3 text-left transition-colors hover:bg-secondary/30 ${isSelected ? 'bg-primary/5' : ''
                    }`}
                >
                  <Avatar
                    src={getConversationAvatar(conv)}
                    fallback={getConversationName(conv)}
                    size="sm"
                    className="h-12 w-12 shrink-0"
                    showStatus={conv.type !== 'group'}
                    status={getOtherMemberStatus(conv)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate text-sm">{getConversationName(conv)}</span>
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="font-medium">{conv.lastMessage.sender}:</span>{' '}
                        {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer com info do usuário */}
        <div className="border-t border-border bg-card px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar
              src={profile?.avatarUrl}
              fallback={profile?.fullName || 'U'}
              size="sm"
              className="h-6 w-6"
              showStatus
              status="online"
            />
            <span className="truncate">{profile?.fullName}</span>
          </div>
        </div>
      </div>

      {/* Painel da conversa ativa (visível apenas em desktop) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-secondary/20">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Messenger Web</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione uma conversa para começar
          </p>
        </div>
      </div>
    </div>
  );
}
