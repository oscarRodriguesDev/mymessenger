'use client';

import { useState, useEffect } from 'react';

interface CircleBadgeProps {
  createdAt: string;   // ISO string
  defaultTTL: number;  // segundos
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds <= 0) return 'Expirado';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
}

function getExpirationPercentage(createdAt: string, defaultTTL: number): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const expiresAt = created + defaultTTL * 1000;
  const total = expiresAt - created;
  const elapsed = now - created;
  const ratio = elapsed / total;
  return Math.min(Math.max(Math.round(ratio * 100), 0), 100);
}

export function CircleBadge({ createdAt, defaultTTL }: CircleBadgeProps) {
  const [remaining, setRemaining] = useState<number>(() => {
    const created = new Date(createdAt).getTime();
    const expiresAt = created + defaultTTL * 1000;
    return Math.max(expiresAt - Date.now(), 0);
  });

  useEffect(() => {
    const tick = () => {
      const created = new Date(createdAt).getTime();
      const expiresAt = created + defaultTTL * 1000;
      setRemaining(Math.max(expiresAt - Date.now(), 0));
    };

    tick();
    const interval = setInterval(tick, 30_000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, [createdAt, defaultTTL]);

  const progress = getExpirationPercentage(createdAt, defaultTTL);
  const isExpired = remaining <= 0;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
        <span>🔥</span>
        <span>Expirado</span>
      </span>
    );
  }

  return (
    <span
      className="group relative inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400"
      title={`Expira em ${formatRemaining(remaining)}`}
    >
      <span>🔥</span>
      <span>Círculo</span>

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-normal text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        Expira em {formatRemaining(remaining)}
      </span>

      {/* Mini progress bar */}
      <span className="ml-1 h-1 w-10 overflow-hidden rounded-full bg-orange-500/20">
        <span
          className="block h-full rounded-full bg-orange-500 transition-all duration-500"
          style={{ width: `${100 - progress}%` }}
        />
      </span>
    </span>
  );
}
