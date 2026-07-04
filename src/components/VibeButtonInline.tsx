'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HiEmojiHappy } from 'react-icons/hi';

type VibeType = 'buzz' | 'poke' | 'wave' | 'heartbeat' | 'fire';

const VIBE_ITEMS: { type: VibeType; emoji: string; label: string }[] = [
  { type: 'buzz', emoji: '👋', label: 'Buzz' },
  { type: 'poke', emoji: '🤏', label: 'Poke' },
  { type: 'wave', emoji: '🖐️', label: 'Wave' },
  { type: 'heartbeat', emoji: '💓', label: 'Heartbeat' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
];

interface VibeButtonInlineProps {
  receiverId: string;
  conversationId?: string;
}

export function VibeButtonInline({ receiverId, conversationId }: VibeButtonInlineProps) {
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
        if (!session) return;

        await fetch('/api/vibe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId, type, conversationId }),
        });
      } catch {
        // Silent
      } finally {
        setSending(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setFlyingEmoji(null), 800);
      }
    },
    [receiverId, conversationId]
  );

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!sending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors disabled:opacity-40"
        title="Enviar sinal (vibe)"
      >
        <HiEmojiHappy className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50">
            <div className="bg-card border border-border rounded-xl shadow-xl p-1.5 flex gap-1">
              {VIBE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => sendVibe(item.type, item.emoji)}
                  disabled={sending === item.type}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-secondary hover:scale-125 transition-all duration-150 disabled:opacity-40"
                  title={item.label}
                >
                  {item.emoji}
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
