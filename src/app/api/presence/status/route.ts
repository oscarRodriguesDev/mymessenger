import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// Limiar para considerar usuário online (90s sem heartbeat = offline)
const ONLINE_THRESHOLD_MS = 90 * 1000;
// Limiar para considerar ausente (5min sem heartbeat)
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

type PresenceStatus = 'online' | 'idle' | 'offline';

/**
 * GET /api/presence/status?userIds=id1,id2,id3
 * Retorna o status de presença para os IDs informados.
 * online  → lastSeenAt < 90s atrás
 * idle    → lastSeenAt < 5min atrás
 * offline → lastSeenAt > 5min atrás ou nunca
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');

    if (!userIdsParam) {
      return NextResponse.json({ error: 'userIds query parameter required' }, { status: 400 });
    }

    const userIds = userIdsParam.split(',').filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, lastSeenAt: true },
    });

    const now = Date.now();

    const statuses: Record<string, { status: PresenceStatus; lastSeenAt: string | null }> = {};

    for (const userId of userIds) {
      const user = users.find((u) => u.id === userId);
      if (!user?.lastSeenAt) {
        statuses[userId] = { status: 'offline', lastSeenAt: null };
        continue;
      }

      const elapsed = now - user.lastSeenAt.getTime();

      if (elapsed < ONLINE_THRESHOLD_MS) {
        statuses[userId] = { status: 'online', lastSeenAt: user.lastSeenAt.toISOString() };
      } else if (elapsed < IDLE_THRESHOLD_MS) {
        statuses[userId] = { status: 'idle', lastSeenAt: user.lastSeenAt.toISOString() };
      } else {
        statuses[userId] = { status: 'offline', lastSeenAt: user.lastSeenAt.toISOString() };
      }
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Presence status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
