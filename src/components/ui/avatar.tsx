interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function Avatar({ src, alt, fallback, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const initials = fallback
    ? fallback.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={alt || fallback || 'Avatar'}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium ${sizes[size]} ${className}`}
    >
      {initials}
    </div>
  );
}

export { Avatar };
