'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

const HEARTBEAT_INTERVAL = 30_000; // 30s
const STATUS_POLL_INTERVAL = 30_000; // 30s (fallback)
const ONLINE_THRESHOLD = 90_000; // 90s

export type PresenceStatus = 'online' | 'idle' | 'offline';

interface UsePresenceOptions {
  /** IDs dos usuários que queremos monitorar */
  watchUserIds?: string[];
  /** Callback chamado quando o status de um usuário monitorado muda */
  onStatusChange?: (userId: string, status: PresenceStatus) => void;
}

interface PresenceReturn {
  /** Conjunto de IDs de usuários online */
  onlineUsers: Set<string>;
  /** Mapa de userId → status */
  statuses: Record<string, PresenceStatus>;
  /** Verifica se um usuário específico está online */
  isOnline: (userId: string) => boolean;
  /** Obtém o status de um usuário */
  getStatus: (userId: string) => PresenceStatus;
}

/**
 * Hook de presença em tempo real.
 *
 * Usa Supabase Realtime Presence para detectar online/offline instantaneamente,
 * com fallback para heartbeat REST + polling.
 */
export function usePresence(options: UsePresenceOptions = {}): PresenceReturn {
  const { watchUserIds = [], onStatusChange } = options;

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, PresenceStatus>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // ── Registrar heartbeat periódico + beforeunload ──
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/presence/heartbeat', { method: 'POST' });
    } catch {
      // Silencia erros de heartbeat (não crítico)
    }
  }, []);

  // ── Inicializar presença ──
  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    // Buscar ID do usuário atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !mountedRef.current) return;

      userIdRef.current = user.id;

      // ── 1) Realtime Presence (instantâneo) ──
      const channel = supabase.channel('presence', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          if (!mountedRef.current) return;
          const state = channel.presenceState();
          // state = { [userId]: [{ userId, onlineAt, ... }] }
          const onlineIds = new Set(Object.keys(state));
          setOnlineUsers(onlineIds);

          // Notificar mudanças para usuários monitorados
          setStatuses((prev) => {
            const next = { ...prev };
            for (const uid of Object.keys(state)) {
              next[uid] = 'online';
            }
            // Usuários que sumiram do state ficam offline
            for (const uid of Object.keys(prev)) {
              if (!state[uid]) {
                next[uid] = 'offline';
                onStatusChange?.(uid, 'offline');
              }
            }
            return next;
          });
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (!mountedRef.current) return;
          setOnlineUsers((prev) => new Set(prev).add(key));
          setStatuses((prev) => ({ ...prev, [key]: 'online' }));
          onStatusChange?.(key, 'online');
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (!mountedRef.current) return;
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setStatuses((prev) => ({ ...prev, [key]: 'offline' }));
          onStatusChange?.(key, 'offline');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && mountedRef.current) {
            // Track este usuário como online
            await channel.track({
              userId: user.id,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      channelRef.current = channel;

      // ── 2) Heartbeat REST (persiste lastSeenAt) ──
      sendHeartbeat(); // Heartbeat inicial
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      // Heartbeat ao fechar/ocultar a página
      const handleVisibility = () => {
        if (document.visibilityState === 'hidden') {
          sendHeartbeat();
          channel.untrack();
        } else if (document.visibilityState === 'visible') {
          channel.track({
            userId: user.id,
            onlineAt: new Date().toISOString(),
          });
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      const handleBeforeUnload = () => {
        sendHeartbeat();
        channel.untrack();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    });

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [sendHeartbeat]);

  // ── 3) Polling de fallback para usuários monitorados ──
  useEffect(() => {
    if (watchUserIds.length === 0) return;

    const fetchStatuses = async () => {
      try {
        const res = await fetch(
          `/api/presence/status?userIds=${watchUserIds.join(',')}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data.statuses) return;

        setStatuses((prev) => {
          const next = { ...prev };
          for (const [uid, info] of Object.entries(data.statuses) as [
            string,
            { status: PresenceStatus; lastSeenAt: string | null }
          ][]) {
            // Só atualiza se o Realtime não tiver um status diferente
            if (!onlineUsers.has(uid) || info.status === 'offline') {
              const prevStatus = prev[uid];
              next[uid] = info.status;
              if (prevStatus && prevStatus !== info.status) {
                onStatusChange?.(uid, info.status);
              }
            }
          }
          return next;
        });
      } catch {
        // Fallback silencioso
      }
    };

    fetchStatuses();
    pollIntervalRef.current = setInterval(fetchStatuses, STATUS_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [watchUserIds.join(',')]);

  // ── Helpers ──
  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers]
  );

  const getStatus = useCallback(
    (userId: string): PresenceStatus => statuses[userId] || 'offline',
    [statuses]
  );

  return { onlineUsers, statuses, isOnline, getStatus };
}
