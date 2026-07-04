import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { circleService, userService } from '@/services';

const TTL_OPTIONS = [3600, 21600, 86400, 259200, 604800] as const; // 1h, 6h, 24h, 3d, 7d

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const circles = await circleService.getUserCircles(userProfile.id);

    return NextResponse.json(circles);
  } catch (error) {
    console.error('Get circles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, memberIds, ttl } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Circle name is required' }, { status: 400 });
    }

    if (!memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: 'memberIds must be an array' }, { status: 400 });
    }

    if (ttl !== undefined && !TTL_OPTIONS.includes(ttl)) {
      return NextResponse.json(
        { error: `Invalid TTL. Must be one of: ${TTL_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Validar que todos os memberIds existem
    const validUsers = await userService.findByIds(memberIds);
    const validIds = validUsers.map((u) => u.id);
    const invalidIds = memberIds.filter((id: string) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some users not found', invalidIds },
        { status: 400 }
      );
    }

    const circle = await circleService.create(
      userProfile.id,
      name.trim(),
      memberIds,
      ttl
    );

    return NextResponse.json(circle, { status: 201 });
  } catch (error) {
    console.error('Create circle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
