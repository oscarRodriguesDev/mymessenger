import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { qrAuthService } from '@/services/qr-auth.service';
import { userService } from '@/services';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Buscar sessão
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

    // Usar Supabase Admin (service role) para gerar magic link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Gerar magic link sem enviar email (admin API não envia email)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/chat`,
      },
    });

    if (error || !data) {
      console.error('Generate link error:', error);
      return NextResponse.json(
        { error: 'Erro ao gerar link de autenticação' },
        { status: 500 }
      );
    }

    // Extrair action_link da resposta
    const actionLink = data.properties?.action_link;

    if (!actionLink) {
      return NextResponse.json(
        { error: 'Erro ao gerar link de autenticação' },
        { status: 500 }
      );
    }

    // Marcar sessão como expirada (já foi usada)
    await qrAuthService.expireSession(session.id);

    return NextResponse.json({
      actionLink,
      email: profile.email,
    });
  } catch (error) {
    console.error('QR exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
