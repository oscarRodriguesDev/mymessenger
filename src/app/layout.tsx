import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { Providers } from '@/providers';
import './globals.css';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display'
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans'
});

export const viewport: Viewport = {
  themeColor: '#10b981',
};

export const metadata: Metadata = {
  title: 'Messenger',
  description: 'Instant messaging platform',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} bg-background`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
