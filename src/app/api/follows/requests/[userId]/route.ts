import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followService, userService } from '@/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await followService.acceptRequest(userProfile.id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accept follow error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await followService.rejectRequest(userProfile.id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject follow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
