'use client';

interface MessageReactionsProps {
  reactions: Record<string, number>;
  onEmojiClick: (emoji: string) => void;
}

export function MessageReactions({ reactions, onEmojiClick }: MessageReactionsProps) {
  const entries = Object.entries(reactions);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onEmojiClick(emoji)}
          className="inline-flex items-center gap-0.5 rounded-full bg-secondary/50 px-1.5 py-0.5 text-xs font-medium hover:bg-secondary transition-colors"
          title={`${count} reação${count > 1 ? 'ões' : ''}`}
        >
          <span className="text-sm leading-none">{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}
    </div>
  );
}