import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';
  const isDesktop = isDesktopFromUA(userAgent);

  // ───────────────────────────────────────────────────────────────
  // APIs: Bloquear TODAS as APIs no desktop (exceto QR e web session)
  // ───────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isAllowedApi =
      pathname.startsWith('/api/qr/') || pathname.startsWith('/api/web/') || pathname.startsWith('/web/');

    if (isDesktop && !isAllowedApi) {
      return NextResponse.json(
        { error: 'Acesso não permitido em desktop. Use /web-access para conectar via QR.' },
        { status: 403 }
      );
    }

    // APIs permitidas (QR, web) ou mobile → continua normal
    return response;
  }

  // ───────────────────────────────────────────────────────────────
  // Página /web: exclusiva para desktop
  // ⚠ NÃO verifica autenticação aqui porque o magic link do Supabase
  // redireciona para /web#access_token=... (hash fica só no cliente).
  // O servidor não vê o hash e o user ainda não está autenticado.
  // O componente cliente (/web page) cuida da verificação de auth.
  // ───────────────────────────────────────────────────────────────
  if (pathname === '/web' || pathname.startsWith('/web/')) {
    if (!isDesktop) {
      // Mobile não pode acessar /web → redireciona para o chat
      const url = request.nextUrl.clone();
      url.pathname = user ? '/chat' : '/login';
      return NextResponse.redirect(url);
    }

    // Desktop → sempre permite (auth é verificada no cliente)
    return response;
  }

  // ───────────────────────────────────────────────────────────────
  // Rotas protegidas (chat, contacts, settings, etc.)
  // ───────────────────────────────────────────────────────────────
  const protectedRoutes = ['/chat', '/contacts', '/groups', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Rotas de auth (login, register, forgot-password)
  const authRoutes = ['/login', '/register', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ── Desktop em rota protegida sem login → /web-access ──
  if (isProtectedRoute && !user && isDesktop) {
    const url = request.nextUrl.clone();
    url.pathname = '/web-access';
    return NextResponse.redirect(url);
  }

  // ── Desktop em rota protegida COM login → permite (já tem sessão web) ──
  if (isProtectedRoute && user && isDesktop) {
    // Usuário desktop logado: deixa acessar as rotas normalmente
    // O componente DesktopRestriction no cliente cuida do bloqueio visual
    return response;
  }

  // ── Mobile em rota protegida sem login → /login ──
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Rotas de auth com usuário logado → redireciona ──
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    // Desktop logado → /web, mobile logado → /chat
    url.pathname = isDesktop ? '/web' : '/chat';
    return NextResponse.redirect(url);
  }

  // ── Rota raiz (/) → redireciona conforme dispositivo e login ──
  if (pathname === '/') {
    const url = request.nextUrl.clone();

    if (isDesktop) {
      url.pathname = user ? '/web' : '/web-access';
    } else {
      url.pathname = user ? '/chat' : '/login';
    }

    return NextResponse.redirect(url);
  }

  return response;
}

function isDesktopFromUA(userAgent: string | null): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'iemobile', 'opera mini', 'webos', 'touch',
  ];

  const isMobileUA = mobileKeywords.some((keyword) => ua.includes(keyword));

  return !isMobileUA;
}