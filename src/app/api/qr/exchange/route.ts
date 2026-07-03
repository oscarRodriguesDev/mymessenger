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
    // TROCAR OTP POR SESSÃO (VIA SERVER-SIDE)
    // ═══════════════════════════════════════════════════════════════
    // 1) Gera magic link via Admin API
    // 2) Extrai o token OTP da URL do magic link
    // 3) Chama POST /auth/v1/verify (server-side) para trocar
    //    o OTP por access_token + refresh_token
    // 4) Seta os cookies de sessão via Supabase SSR
    //
    // Isso evita o redirect cross-domain do navegador!

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

    // 2) Extrair o token OTP da action_link
    const urlObj = new URL(actionLink);
    const otpToken = urlObj.searchParams.get('token');
    if (!otpToken) {
      return NextResponse.json(
        { error: 'Token OTP não encontrado no link' },
        { status: 500 }
      );
    }

    // 3) Trocar OTP por sessão via server-side
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({
        type: 'magiclink',
        token: otpToken,
        redirect_to: `${baseUrl}/web`,
      }),
    });

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text();
      console.error('Verify OTP error:', verifyRes.status, errBody);
      return NextResponse.json(
        { error: 'Erro ao verificar token de autenticação' },
        { status: 500 }
      );
    }

    const verifyData = await verifyRes.json();
    const accessToken: string = verifyData.access_token;
    const refreshToken: string = verifyData.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error('Verify response missing tokens:', verifyData);
      return NextResponse.json(
        { error: 'Resposta de autenticação inválida' },
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

    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, '', { ...options, maxAge: 0, path: '/' });
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
