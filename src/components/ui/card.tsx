interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-lg hover:shadow-xl transition-shadow duration-200 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`mb-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = '' }: CardProps) {
  return (
    <h3 className={`text-xl font-semibold text-foreground ${className}`}>
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
