'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VibeSignalData {
  id: string;
  senderId: string;
  receiverId: string;
  type: string;
  conversationId: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

const POLLING_INTERVAL = 15000; // 15 segundos
const DISMISS_TIMEOUT = 8000; // 8 segundos

const VIBE_EMOJI: Record<string, string> = {
  buzz: '👋',
  poke: '🤏',
  wave: '🖐️',
  heartbeat: '💓',
  fire: '🔥',
};

const VIBE_LABEL: Record<string, string> = {
  buzz: 'Buzz',
  poke: 'Poke',
  wave: 'Wave',
  heartbeat: 'Heartbeat',
  fire: 'Fire',
};

export default function VibeNotification() {
  const [notifications, setNotifications] = useState<
    (VibeSignalData & { dismissing?: boolean })[]
  >([]);
  const processedIds = useRef<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Função para dar dismiss em uma notificação
  const dismissNotification = useCallback((signalId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === signalId ? { ...n, dismissing: true } : n))
    );

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== signalId));
      processedIds.current.delete(signalId);
    }, 300);
  }, []);

  // Auto-dismiss após 8s
  const scheduleDismiss = useCallback(
    (signalId: string) => {
      const existing = timeoutRefs.current.get(signalId);
      if (existing) clearTimeout(existing);

      const timeout = setTimeout(() => {
        dismissNotification(signalId);
        timeoutRefs.current.delete(signalId);
      }, DISMISS_TIMEOUT);

      timeoutRefs.current.set(signalId, timeout);
    },
    [dismissNotification]
  );

  // Retribuir vibe
  const retributeVibe = useCallback(
    async (signal: VibeSignalData) => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        await fetch('/api/vibe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: signal.senderId,
            type: signal.type,
            conversationId: signal.conversationId,
          }),
        });

        dismissNotification(signal.id);
      } catch (error) {
        console.error('Failed to retribute vibe:', error);
      }
    },
    [dismissNotification]
  );

  // Polling de sinais pendentes
  useEffect(() => {
    const fetchPendingSignals = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const response = await fetch('/api/vibe/pending');
        if (!response.ok) return;

        const signals: VibeSignalData[] = await response.json();

        for (const signal of signals) {
          if (!processedIds.current.has(signal.id)) {
            processedIds.current.add(signal.id);
            setNotifications((prev) => [...prev, signal]);
            scheduleDismiss(signal.id);
          }
        }
      } catch (error) {
        // Silencioso - não mostrar erros de polling
      }
    };

    // Buscar imediatamente
    fetchPendingSignals();

    // Polling periódico
    const interval = setInterval(fetchPendingSignals, POLLING_INTERVAL);

    return () => {
      clearInterval(interval);
      // Limpar todos os timeouts
      for (const timeout of timeoutRefs.current.values()) {
        clearTimeout(timeout);
      }
    };
  }, [scheduleDismiss]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg
                      border border-gray-200 dark:border-gray-700
                      p-4 transition-all duration-300
                      ${
                        notification.dismissing
                          ? 'opacity-0 translate-x-4'
                          : 'opacity-100 translate-x-0'
                      }`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar do remetente */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg">
              {notification.sender.avatarUrl ? (
                <img
                  src={notification.sender.avatarUrl}
                  alt={notification.sender.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                notification.sender.fullName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">
                  {notification.sender.fullName}
                </span>{' '}
                te enviou um{' '}
                <span className="font-medium">
                  {VIBE_EMOJI[notification.type] || ''}{' '}
                  {VIBE_LABEL[notification.type] || notification.type}
                </span>
                !
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => retributeVibe(notification)}
                  className="px-3 py-1 text-xs font-medium text-white
                             bg-indigo-600 hover:bg-indigo-700
                             rounded-full transition-colors duration-150"
                >
                  Retribuir
                </button>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="px-3 py-1 text-xs font-medium text-gray-500
                             hover:text-gray-700 dark:text-gray-400
                             dark:hover:text-gray-200
                             bg-gray-100 dark:bg-gray-700
                             hover:bg-gray-200 dark:hover:bg-gray-600
                             rounded-full transition-colors duration-150"
                >
                  Dispensar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
