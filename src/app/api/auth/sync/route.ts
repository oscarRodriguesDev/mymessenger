import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/services';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userProfile = await userService.findByAuthId(authUser.id);

    if (!userProfile) {
      const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || '';
      const fullName = authUser.user_metadata?.full_name || authUser.email || '';

      userProfile = await userService.create({
        authId: authUser.id,
        username,
        fullName,
        email: authUser.email || '',
      });
    }

    return NextResponse.json({
      id: userProfile.id,
      authId: userProfile.authId,
      username: userProfile.username,
      fullName: userProfile.fullName,
      email: userProfile.email,
      avatarUrl: userProfile.avatarUrl,
      bio: userProfile.bio,
      phone: userProfile.phone,
      discoverableByPhone: userProfile.discoverableByPhone,
      discoverableByUsername: userProfile.discoverableByUsername,
      readReceiptEnabled: userProfile.readReceiptEnabled,
      typingIndicatorEnabled: userProfile.typingIndicatorEnabled,
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
