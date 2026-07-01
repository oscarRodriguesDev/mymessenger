interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = '' }: CardProps) {
  return (
    <h3 className={`text-lg font-semibold ${className}`}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardContent };
