import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService, userService } from '@/services';

export async function POST(request: Request) {
  try {
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json({ error: 'participantId required' }, { status: 400 });
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

    const conversation = await conversationService.createPrivateConversation(
      userProfile.id,
      participantId
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const conversations = await conversationService.findUserConversations(userProfile.id);

    const formatted = conversations.map(conv => ({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatarUrl: conv.avatarUrl,
      lastMessage: conv.messages[0] ? {
        text: conv.messages[0].text,
        sender: conv.messages[0].sender.fullName,
        createdAt: conv.messages[0].createdAt,
      } : null,
      members: conv.members.map(m => ({
        id: m.user.id,
        username: m.user.username,
        fullName: m.user.fullName,
        avatarUrl: m.user.avatarUrl,
      })),
      updatedAt: conv.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
