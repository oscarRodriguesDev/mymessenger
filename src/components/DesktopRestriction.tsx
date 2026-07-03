'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isDesktopFromBrowser } from '@/lib/desktop-detection';

export function DesktopRestriction({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Rotas permitidas no desktop (fluxo Web)
    const allowedRoutes = [
      '/web-access', '/scan', '/desktop-restricted',
      '/web',          // página da aplicação web restrita
    ];
    const isAllowedRoute = allowedRoutes.some((route) =>
      pathname?.startsWith(route)
    );

    // Se está em /web ou subrotas, NÃO bloqueia independente do dispositivo
    // (o middleware já bloqueia mobile de acessar /web)
    if (pathname?.startsWith('/web')) {
      setBlocked(false);
    } else if (isAllowedRoute) {
      setBlocked(false);
    } else {
      setBlocked(isDesktopFromBrowser());
    }
    
    setChecking(false);

    // Re-checar se a tela for redimensionada
    const handleResize = () => {
      if (pathname?.startsWith('/web')) {
        setBlocked(false);
      } else if (isAllowedRoute) {
        setBlocked(false);
      } else {
        setBlocked(isDesktopFromBrowser());
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname]);

  if (checking) {
    // Evita flash de conteúdo
    return null;
  }

  if (blocked) {
    return <DesktopBlockScreen />;
  }

  return <>{children}</>;
}

function DesktopBlockScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-6">
        {/* Ícone de celular */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-12 w-12 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Aplicativo não disponível para desktop
        </h1>

        <p className="text-muted-foreground leading-relaxed">
          Por enquanto, o Messenger está disponível apenas para dispositivos móveis.
          Acesse pelo seu celular ou tablet para usar o aplicativo.
        </p>

        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm text-muted-foreground">
            Estamos trabalhando para trazer a experiência completa para o desktop em breve! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}