interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Quando true, exibe um indicador de presença no canto inferior direito */
  showStatus?: boolean;
  /** Status de presença (online, idle, offline) */
  status?: 'online' | 'idle' | 'offline';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const statusDotSizes: Record<string, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className = '',
  showStatus = false,
  status = 'offline',
}: AvatarProps) {
  const initials = fallback
    ? fallback.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarContent = src ? (
    <img
      src={src}
      alt={alt || fallback || 'Avatar'}
      className={`rounded-full object-cover ${sizeClasses[size]}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );

  if (showStatus) {
    return (
      <div className={`relative inline-flex shrink-0 ${className}`}>
        {avatarContent}
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background ${statusDotSizes[size]} ${statusColors[status]}`}
          title={status === 'online' ? 'Online' : status === 'idle' ? 'Ausente' : 'Offline'}
          aria-label={status === 'online' ? 'Online' : status === 'idle' ? 'Ausente' : 'Offline'}
        />
      </div>
    );
  }

  return <div className={`inline-flex shrink-0 ${className}`}>{avatarContent}</div>;
}

export { Avatar };
