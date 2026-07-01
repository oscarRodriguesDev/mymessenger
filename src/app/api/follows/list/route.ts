import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followService, userService } from '@/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'friends';

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let data;
    switch (type) {
      case 'friends':
        data = await followService.getFriends(userProfile.id);
        break;
      case 'followers':
        data = await followService.getFollowers(userProfile.id);
        break;
      case 'following':
        data = await followService.getFollowing(userProfile.id);
        break;
      case 'pending':
        data = await followService.getPendingRequests(userProfile.id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get follows error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
