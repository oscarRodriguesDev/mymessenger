'use client';

import type { PresenceStatus } from '@/hooks/usePresence';

interface OnlineIndicatorProps {
  status: PresenceStatus;
  /** Tamanho do indicador (default: sm) */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  idle: 'Ausente',
  offline: 'Offline',
};

/**
 * Indicador visual de presença (bolinha verde/amarela/cinza).
 */
export function OnlineIndicator({
  status,
  size = 'sm',
  className = '',
}: OnlineIndicatorProps) {
  return (
    <span
      className={`inline-block rounded-full ring-2 ring-background ${sizeClasses[size]} ${statusColors[status]} ${className}`}
      title={statusLabels[status]}
      aria-label={statusLabels[status]}
    />
  );
}
