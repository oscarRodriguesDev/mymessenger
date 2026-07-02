'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/providers/ThemeProvider';

const navItems = [
  {
    href: '/chat',
    label: 'Chat',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/contacts',
    label: 'Contatos',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export function Navigation() {
  const pathname = usePathname();
  let theme: 'dark' | 'light' = 'dark';
  let toggleTheme: () => void = () => {};

  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch (error) {
    // Durante SSR/prerendering, useTheme pode falhar - usar fallback
    // Em produção no cliente, o ThemeProvider estará disponível
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm shadow-sm px-4">
      <div className="flex flex-1 items-center">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        onClick={toggleTheme}
        className="ml-2 rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-secondary/30 hover:text-foreground"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      >
        {theme === 'dark' ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4M4.22 4.22l2.83 2.83m8.04 8.04l2.83 2.83M2 12h4m12 0h4M4.22 19.78l2.83-2.83m8.04-8.04l2.83-2.83" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.64 15.95c-.18-1.34-.64-2.59-1.33-3.65a6.96 6.96 0 0 0-2.15-2.38c-.79-.64-1.23-1.72-1.23-2.92a4.51 4.51 0 0 0-8.66-1.33c-.5.62-.87 1.32-1.11 2.05-.24.74-.36 1.51-.35 2.28 0 1.2-.45 2.3-1.23 2.92a6.96 6.96 0 0 0-2.15 2.38c-.68 1.06-1.14 2.3-1.32 3.64-.1.62-.15 1.25-.15 1.88a8 8 0 0 0 16 0c0-.63-.05-1.26-.15-1.88z" />
          </svg>
        )}
      </button>
    </nav>
  );
}
