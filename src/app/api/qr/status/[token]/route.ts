import { NextResponse } from 'next/server';
import { qrAuthService } from '@/services/qr-auth.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const session = await qrAuthService.findByToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Verificar expiração
    if (session.status === 'pending' && session.expiresAt < new Date()) {
      await qrAuthService.expireSession(session.id);
      return NextResponse.json({ status: 'expired' });
    }

    return NextResponse.json({
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('QR status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
