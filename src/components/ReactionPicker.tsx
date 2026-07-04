'use client';

import { useState } from 'react';

const EMOJIS = ['😂', '❤️', '👍', '😮', '😢', '😡', '🎉', '🔥', '👏', '💯'];

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ isOpen, onSelect, onClose }: ReactionPickerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute z-10 -top-12 left-1/2 -translate-x-1/2 flex gap-1 rounded-xl bg-card border border-border p-1.5 shadow-lg">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-lg hover:bg-secondary hover:scale-125 transition-all duration-150"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}