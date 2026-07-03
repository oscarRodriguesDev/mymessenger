import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    // OBTER TOKENS DE SESSÃO VIA MAGIC LINK (SERVER-SIDE)
    // ═══════════════════════════════════════════════════════════════
    // 1) Gera magic link via Admin API
    // 2) Visita o action_link via GET server-side
    // 3) Extrai os tokens do hash da URL de redirect
    // 4) Retorna redirectTo com tokens no hash para o frontend
    //
    // O GoTrueClient no frontend detecta #access_token= no hash
    // e processa o implicit grant callback automaticamente,
    // obtendo o usuário e criando a sessão!

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    // 2) Visitar o action_link via GET (server-side)
    const magicRes = await fetch(actionLink, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MessengerWeb/1.0)',
      },
    });

    // Extrair tokens do hash da URL de redirect
    const locationHeader = magicRes.headers.get('location');
    if (!locationHeader) {
      console.error('No redirect location, status:', magicRes.status);
      return NextResponse.json(
        { error: 'Erro no redirecionamento de autenticação' },
        { status: 500 }
      );
    }

    const redirectUrl = locationHeader.startsWith('http')
      ? new URL(locationHeader)
      : new URL(locationHeader, baseUrl);

    const hashPart = redirectUrl.hash.replace(/^#/, '');

    if (!hashPart) {
      console.error('No hash in redirect location:', locationHeader);
      return NextResponse.json(
        { error: 'Tokens de autenticação não encontrados no redirect' },
        { status: 500 }
      );
    }

    const hashParams = new URLSearchParams(hashPart);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens in hash. Hash:', hashPart);
      return NextResponse.json(
        { error: 'Tokens de sessão não encontrados' },
        { status: 500 }
      );
    }

    // 3) Marcar sessão QR como expirada
    await qrAuthService.expireSession(session.id);

    // 4) Passar os tokens para o frontend via hash na URL
    // O GoTrueClient no frontend detecta #access_token=...
    // e processa como implicit grant callback automaticamente!
    const hashForRedirect = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: hashParams.get('expires_in') || '3600',
      token_type: hashParams.get('token_type') || 'bearer',
    });

    return NextResponse.json({
      redirectTo: `/web#${hashForRedirect.toString()}`,
      email: profile.email,
    });
  } catch (error) {
    console.error('QR exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
