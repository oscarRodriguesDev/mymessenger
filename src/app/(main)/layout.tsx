import { Navigation } from '@/components/layout/Navigation';
import { VibeNotificationWrapper } from '@/components/VibeNotificationWrapper';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      <main className="flex-1 overflow-auto">{children}</main>
      <VibeNotificationWrapper />
    </div>
  );
}
