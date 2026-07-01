import { Navigation } from '@/components/layout/Navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
