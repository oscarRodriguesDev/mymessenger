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

  // Rotas públicas que funcionam no desktop (QR web, scan, etc.)
  const desktopPublicRoutes = ['/desktop-restricted', '/web-access', '/scan'];
  const isDesktopPublicRoute = desktopPublicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isDesktop && !isDesktopPublicRoute) {
    const pathname = request.nextUrl.pathname;

    // API routes do QR são permitidas no desktop (necessárias para o fluxo web)
    const qrApiRoutes = ['/api/qr/'];
    const isQrApiRoute = qrApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isQrApiRoute) {
      // Permitir APIs do QR continuarem
      return response;
    }

    // Outras API routes: retornar 403 JSON
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
