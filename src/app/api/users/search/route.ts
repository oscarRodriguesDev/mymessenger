import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followService, userService } from '@/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
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

    const users = await followService.searchUsers(query, userProfile.id);

    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const status = await followService.getFollowStatus(userProfile.id, user.id);
        return { ...user, ...status };
      })
    );

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
