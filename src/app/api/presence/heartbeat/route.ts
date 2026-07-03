import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/presence/heartbeat
 * Atualiza o lastSeenAt do usuário para o momento atual.
 * Chamado pelo cliente a cada 30 segundos enquanto estiver ativo.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Atualizar lastSeenAt no banco
    await prisma.user.updateMany({
      where: { authId: authUser.id },
      data: { lastSeenAt: now },
    });

    return NextResponse.json({
      success: true,
      lastSeenAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
