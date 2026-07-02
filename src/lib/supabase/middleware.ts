import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDesktopFromUA } from '@/lib/desktop-detection';

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

  // ───────────────────────────────────────────────────────────────
  // Desktop detection — bloqueia acesso de computadores desktop
  // ───────────────────────────────────────────────────────────────
  const userAgent = request.headers.get('user-agent');
  const isDesktop = isDesktopFromUA(userAgent);
  const isDesktopRestrictedPage = request.nextUrl.pathname === '/desktop-restricted';

  if (isDesktop && !isDesktopRestrictedPage) {
    const pathname = request.nextUrl.pathname;

    // API routes: retornar 403 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acesso não permitido em desktop. Use um dispositivo móvel.' },
        { status: 403 }
      );
    }

    // Páginas: redirecionar para tela informativa
    const url = request.nextUrl.clone();
    url.pathname = '/desktop-restricted';
    return NextResponse.redirect(url);
  }

  // ───────────────────────────────────────────────────────────────
  // Autenticação — rotas protegidas
  // ───────────────────────────────────────────────────────────────
  const protectedRoutes = ['/chat', '/contacts', '/groups', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Rotas de auth (redirecionar se já logado)
  const authRoutes = ['/login', '/register', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/chat';
    return NextResponse.redirect(url);
  }

  return response;
}
