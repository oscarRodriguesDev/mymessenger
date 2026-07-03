import { NextResponse } from 'next/server';
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
    // CRIAR SESSÃO SUPABASE DIRETAMENTE VIA ADMIN API
    // ═══════════════════════════════════════════════════════════════
    // Em vez de magic link (redirect cross-domain frágil),
    // criamos a sessão via Admin API e setamos cookies diretamente.

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) Criar sessão via GoTrue Admin API
    const sessionRes = await fetch(`${supabaseUrl}/auth/v1/admin/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ user_id: session.authId }),
    });

    if (!sessionRes.ok) {
      const errBody = await sessionRes.text();
      console.error('Admin create session error:', sessionRes.status, errBody);
      return NextResponse.json(
        { error: 'Erro ao criar sessão de autenticação' },
        { status: 500 }
      );
    }

    const sessionData = await sessionRes.json();
    const accessToken: string = sessionData.access_token;
    const refreshToken: string = sessionData.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error('Admin session missing tokens:', sessionData);
      return NextResponse.json(
        { error: 'Erro ao obter tokens de sessão' },
        { status: 500 }
      );
    }

    // 2) Marcar sessão QR como expirada
    await qrAuthService.expireSession(session.id);

    // 3) Construir resposta e usar Supabase SSR para setar cookies
    const response = NextResponse.json({
      redirectTo: '/web',
      email: profile.email,
    });

    // Obter cookies da requisição via next/headers
    const cookieStore = await cookies();

    // Usar o Supabase SSR client para setar os cookies corretamente
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value ?? null;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Propagar os cookies para a resposta HTTP
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

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
