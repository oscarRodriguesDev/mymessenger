import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messenger Web',
  description: 'Messenger Web - Acesso pelo computador',
};

export default function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {children}
    </div>
  );
}
