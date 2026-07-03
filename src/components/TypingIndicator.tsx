'use client';

interface TypingIndicatorProps {
  typingUserNames: string[];
}

export function TypingIndicator({ typingUserNames }: TypingIndicatorProps) {
  if (typingUserNames.length === 0) return null;

  let text: string;
  if (typingUserNames.length === 1) {
    text = `${typingUserNames[0]} está digitando...`;
  } else if (typingUserNames.length === 2) {
    text = `${typingUserNames[0]} e ${typingUserNames[1]} estão digitando...`;
  } else {
    text = 'Várias pessoas estão digitando...';
  }

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-200">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </span>
      <span className="italic">{text}</span>
    </div>
  );
}
