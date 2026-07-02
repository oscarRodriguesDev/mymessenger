export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
