'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const TYPING_TIMEOUT_MS = 3000; // Soma 3s sem evento = parou de digitar
const DEBOUNCE_MS = 1000;       // Só envia "parou" após 1s parado

interface UseTypingIndicatorOptions {
  conversationId: string;
  currentUserId: string;
  /** Se o usuário atual pode ENVIAR indicadores para outros */
  enabled: boolean;
}

interface UseTypingIndicatorReturn {
  /** Nomes dos usuários que estão digitando (excluindo o atual) */
  typingUserNames: string[];
  /** Chama com `true` quando começa a digitar, `false` quando para */
  setTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator({
  conversationId,
  currentUserId,
  enabled,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);

  // ── Subscribe no canal de broadcast ──
  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } }, // ignorar nossos próprios eventos
    });

    channel
      .on('broadcast', { event: 'typing_start' }, ({ payload }: { payload: { userId: string; fullName: string } }) => {
        if (!mountedRef.current || payload.userId === currentUserId) return;

        // Renovar ou criar timer de expiração
        const existing = timersRef.current.get(payload.userId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
          timersRef.current.delete(payload.userId);
          setTypingUsers((prev) => { const next = new Map(prev); next.delete(payload.userId); return next; });
        }, TYPING_TIMEOUT_MS);
        timersRef.current.set(payload.userId, timer);

        setTypingUsers((prev) => { const next = new Map(prev); next.set(payload.userId, payload.fullName); return next; });
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }: { payload: { userId: string } }) => {
        if (!mountedRef.current) return;
        const timer = timersRef.current.get(payload.userId);
        if (timer) { clearTimeout(timer); timersRef.current.delete(payload.userId); }
        setTypingUsers((prev) => { const next = new Map(prev); next.delete(payload.userId); return next; });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      channel.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  // ── Broadcast typing_start / typing_stop ──
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!enabled) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const supabase = createClient();
      // Usa canal avulso para enviar (não precisa ser o mesmo channel)
      const sendChannel = supabase.channel(`typing:${conversationId}`);

      if (isTyping) {
        // Buscar fullName do usuário atual para enviar no payload
        fetch('/api/auth/sync', { method: 'POST' })
          .then((res) => res.json())
          .then((profile) => {
            if (!mountedRef.current) return;
            sendChannel.send({
              type: 'broadcast',
              event: 'typing_start',
              payload: { userId: currentUserId, fullName: profile.fullName },
            });
          })
          .catch(() => {
            // fallback: envia mesmo sem fullName (outro lado mostra só "Alguém")
            if (!mountedRef.current) return;
            sendChannel.send({
              type: 'broadcast',
              event: 'typing_start',
              payload: { userId: currentUserId, fullName: '' },
            });
          });
      } else {
        debounceRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          sendChannel.send({
            type: 'broadcast',
            event: 'typing_stop',
            payload: { userId: currentUserId },
          });
        }, DEBOUNCE_MS);
      }
    },
    [conversationId, currentUserId, enabled]
  );

  const typingUserNames = Array.from(typingUsers.values()).filter(Boolean);

  return { typingUserNames, setTyping };
}
