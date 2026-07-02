import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';
  
  // DEBUG: Log para verificar o que está acontecendo
  console.log('=== MIDDLEWARE DEBUG ===');
  console.log('Pathname:', pathname);
  console.log('User-Agent:', userAgent.substring(0, 100) + '...');
  
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
  // Rotas PERMITIDAS no desktop (fluxo QR Web)
  // ───────────────────────────────────────────────────────────────
  const desktopAllowedRoutes = ['/web-access', '/scan', '/desktop-restricted'];
  const isDesktopAllowed = desktopAllowedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // APIs do QR também são permitidas no desktop
  const isQrApi = pathname.startsWith('/api/qr/');

  console.log('isDesktopAllowed:', isDesktopAllowed);
  console.log('isQrApi:', isQrApi);

  if (isDesktopAllowed || isQrApi) {
    console.log('✅ Rota permitida no desktop - continuando...');
    // Permitir acesso normal, continua para autenticação
  } else {
    // ───────────────────────────────────────────────────────────────
    // Detecção desktop para outras rotas
    // ───────────────────────────────────────────────────────────────
    const isDesktop = isDesktopFromUA(userAgent);
    console.log('isDesktop:', isDesktop);

    if (isDesktop) {
      console.log('🚫 Desktop detectado em rota não permitida');
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
      console.log('Redirecionando para:', url.pathname);
      return NextResponse.redirect(url);
    }
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

function isDesktopFromUA(userAgent: string | null): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  // Keywords mobile/tablet
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'iemobile', 'opera mini', 'webos', 'touch',
  ];

  const isMobileUA = mobileKeywords.some((keyword) => ua.includes(keyword));

  // Se não tem keyword mobile, provavelmente é desktop
  return !isMobileUA;
}