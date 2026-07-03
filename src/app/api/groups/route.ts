import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService, userService } from '@/services';

export async function POST(request: Request) {
  try {
    const { name, memberIds } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 });
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

    // Verificar se todos os memberIds existem
    const validUsers = await userService.findByIds(memberIds);
    const validIds = validUsers.map((u) => u.id);
    const invalidIds = memberIds.filter((id: string) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some users not found', invalidIds },
        { status: 400 }
      );
    }

    const conversation = await conversationService.createGroupConversation(
      userProfile.id,
      name.trim(),
      memberIds
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
