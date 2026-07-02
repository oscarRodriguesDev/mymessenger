import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { qrAuthService } from '@/services/qr-auth.service';
import { userService } from '@/services';

export async function POST(request: Request) {
  try {
    // Usuário mobile precisa estar autenticado
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized - faça login no celular primeiro' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Buscar profile do usuário mobile no banco
    const profile = await userService.findByAuthId(authUser.id);
    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    // Confirmar sessão
    const session = await qrAuthService.confirmSession(token, profile.id, authUser.id);

    if (!session) {
      return NextResponse.json(
        { error: 'QR code inválido ou expirado. Tente novamente.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'QR code confirmado!',
      status: 'confirmed',
    });
  } catch (error) {
    console.error('QR confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
