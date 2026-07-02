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

  // ───────────────────────────────────────────────────────────────
  // APIs: Bloquear TODAS as APIs no desktop (exceto QR)
  // ───────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isQrApi = pathname.startsWith('/api/qr/');
    
    if (!isQrApi) {
      // Verificar se é desktop
      const userAgent = request.headers.get('user-agent');
      const isDesktop = isDesktopFromUA(userAgent);
      
      if (isDesktop) {
        return NextResponse.json(
          { error: 'Acesso não permitido em desktop. Use /web-access para conectar via QR.' },
          { status: 403 }
        );
      }
    }
    
    // APIs do QR ou mobile → continua normal
    return response;
  }

  // ───────────────────────────────────────────────────────────────
  // Páginas: NUNCA bloquear no middleware
  // O bloqueio visual é feito no cliente (DesktopRestriction component)
  // ───────────────────────────────────────────────────────────────
  // Removeu-se o bloqueio de páginas no middleware
  // Agora todas as páginas são acessíveis, e o componente DesktopRestriction
  // decide se mostra a tela de bloqueio ou a tela de QR

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

  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'iemobile', 'opera mini', 'webos', 'touch',
  ];

  const isMobileUA = mobileKeywords.some((keyword) => ua.includes(keyword));

  return !isMobileUA;
}