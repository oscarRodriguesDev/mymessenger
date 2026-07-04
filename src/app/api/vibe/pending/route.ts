import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vibeService, userService } from '@/services';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const pendingSignals = await vibeService.getPendingSignals(userProfile.id);

    return NextResponse.json(pendingSignals);
  } catch (error) {
    console.error('Get pending vibes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
