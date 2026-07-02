import { NextResponse } from 'next/server';
import { qrAuthService } from '@/services/qr-auth.service';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    // User-Agent para debug/info
    const userAgent = request.headers.get('user-agent') || undefined;

    // Criar sessão
    const session = await qrAuthService.createSession(userAgent);

    // Construir URL do QR: quando escaneado, abre no celular
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/scan?token=${session.token}`;

    // Gerar imagem QR como data URL (para exibir no <img>)
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      token: session.token,
      qrDataUrl,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('QR create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
