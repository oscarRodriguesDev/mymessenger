import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { qrAuthService, webSessionService } from '@/services';
import { userService } from '@/services';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Buscar sessão QR
    const session = await qrAuthService.findByToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    if (session.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'QR code ainda não foi confirmado' },
        { status: 400 }
      );
    }

    if (!session.authId) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 400 });
    }

    // Buscar dados do usuário
    const profile = await userService.findById(session.userId!);
    if (!profile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // ── Criar sessão web com validade de 7 dias ──
    await webSessionService.createSession(profile.id, session.authId);

    // ═══════════════════════════════════════════════════════════════
    // CRIAR SESSÃO SUPABASE SERVER-SIDE
    // ═══════════════════════════════════════════════════════════════
    // 1) Gera magic link via Admin API
    // 2) Visita o action_link via GET server-side (como o navegador
    //    faria) — o Supabase redireciona (302) para o redirectTo
    //    com tokens no hash (#access_token=xxx&refresh_token=yyy)
    // 3) Extrai os tokens do hash da URL de redirect
    // 4) Seta a sessão no servidor via Supabase SSR (setSession)
    //
    // Isso evita o redirect cross-domain e a perda do hash!

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // ── Obter URL base dinamicamente ──
    const baseUrl =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    // 1) Gerar magic link via Admin API
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: `${baseUrl}/web`,
      },
    });

    if (linkError || !data) {
      console.error('Generate link error:', linkError);
      return NextResponse.json(
        { error: 'Erro ao gerar link de autenticação' },
        { status: 500 }
      );
    }

    const actionLink: string | undefined = data.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json(
        { error: 'Erro ao gerar link de autenticação' },
        { status: 500 }
      );
    }

    // 2) Visitar o action_link via GET (server-side) como o navegador faria
    // O Supabase processa o magic link e redireciona (302) para a URL de
    // redirectTo com os tokens de sessão no hash (#access_token=...).
    // Precisamos seguir manualmente para capturar os dados.
    const magicRes = await fetch(actionLink, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MessengerWeb/1.0)',
      },
    });

    // Pega o Location do redirect (ex: /web#access_token=xxx&refresh_token=yyy)
    const locationHeader = magicRes.headers.get('location');
    if (!locationHeader) {
      console.error('No redirect location, status:', magicRes.status);
      return NextResponse.json(
        { error: 'Erro no redirecionamento de autenticação' },
        { status: 500 }
      );
    }

    // Resolver o Location (pode ser relativo ou absoluto)
    const redirectUrl = locationHeader.startsWith('http')
      ? new URL(locationHeader)
      : new URL(locationHeader, baseUrl);

    // Extrair o hash da URL de redirect
    // O Supabase inclui os tokens no hash: #access_token=xxx&refresh_token=yyy
    const hashPart = redirectUrl.hash.replace(/^#/, '');

    if (!hashPart) {
      console.error('No hash in redirect location:', locationHeader);
      return NextResponse.json(
        { error: 'Tokens de autenticação não encontrados no redirect' },
        { status: 500 }
      );
    }

    // Parsear os parâmetros do hash
    const hashParams = new URLSearchParams(hashPart);
    const accessToken: string | null = hashParams.get('access_token');
    const refreshToken: string | null = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens in hash. Hash:', hashPart);
      return NextResponse.json(
        { error: 'Tokens de sessão não encontrados' },
        { status: 500 }
      );
    }

    // 4) Marcar sessão QR como expirada
    await qrAuthService.expireSession(session.id);

    // 5) Construir resposta e usar Supabase SSR para setar cookies
    const response = NextResponse.json({
      redirectTo: '/web',
      email: profile.email,
    });

    const cookieStore = await cookies();

    // Determinar se a conexão é segura (produção com HTTPS)
    const isSecure =
      request.url.startsWith('https://') || process.env.NODE_ENV === 'production';

    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, {
            ...options,
            // Não forçar httpOnly — o cliente (createBrowserClient) precisa
            // ler os cookies via document.cookie para autenticar o usuário.
            // O default da biblioteca é httpOnly: false.
            secure: isSecure,
            path: '/',
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, '', {
            ...options,
            maxAge: 0,
            path: '/',
            secure: isSecure,
          });
        },
      },
    });

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setSessionError) {
      console.error('Set session error:', setSessionError);
      return NextResponse.json(
        { error: 'Erro ao configurar sessão' },
        { status: 500 }
      );
    }

    return response;
  } catch (error) {
    console.error('QR exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
