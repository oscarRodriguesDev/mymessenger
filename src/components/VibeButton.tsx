'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type VibeType = 'buzz' | 'poke' | 'wave' | 'heartbeat' | 'fire';

interface VibeOption {
  type: VibeType;
  label: string;
  emoji: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  { type: 'buzz', label: 'Buzz', emoji: '👋' },
  { type: 'poke', label: 'Poke', emoji: '🤏' },
  { type: 'wave', label: 'Wave', emoji: '🖐️' },
  { type: 'heartbeat', label: 'Heartbeat', emoji: '💓' },
  { type: 'fire', label: 'Fire', emoji: '🔥' },
];

interface VibeButtonProps {
  receiverId: string;
  conversationId?: string;
  dropdownUp?: boolean;
}

export default function VibeButton({ receiverId, conversationId, dropdownUp = true }: VibeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [flyingEmoji, setFlyingEmoji] = useState<{ emoji: string; id: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendVibe = useCallback(
    async (type: VibeType, emoji: string) => {
      setSending(type);
      setIsOpen(false);

      const id = Date.now();
      setFlyingEmoji({ emoji, id });

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('Not authenticated');
          return;
        }

        const response = await fetch('/api/vibe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId, type, conversationId }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to send vibe:', error);
        }
      } catch (error) {
        console.error('Error sending vibe:', error);
      } finally {
        setSending(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setFlyingEmoji(null);
        }, 800);
      }
    },
    [receiverId, conversationId]
  );

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!sending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Enviar sinal"
      >
        <span className="text-base">👋</span>
        <span>Vibe</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className={`absolute z-50 ${dropdownUp ? 'bottom-full left-0 mb-2' : 'top-full left-0 mt-2'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[180px]">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1">
                Enviar sinal
              </div>
              {VIBE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => sendVibe(option.type, option.emoji)}
                  disabled={sending === option.type}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span>{option.label}</span>
                  {sending === option.type && (
                    <span className="ml-auto">
                      <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {flyingEmoji && (
        <div
          key={flyingEmoji.id}
          className="fixed pointer-events-none z-50 animate-vibe-fly"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <span className="text-4xl">{flyingEmoji.emoji}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes vibeFly {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
          30% { opacity: 1; transform: translate(-50%, -80%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -200%) scale(0.8); }
        }
        :global(.animate-vibe-fly) {
          animation: vibeFly 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
