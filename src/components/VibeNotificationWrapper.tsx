'use client';

import dynamic from 'next/dynamic';

const VibeNotification = dynamic(
  () => import('@/components/VibeNotification'),
  { ssr: false }
);

export function VibeNotificationWrapper() {
  return <VibeNotification />;
}
