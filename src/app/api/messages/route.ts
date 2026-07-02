import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messageService, userService, conversationService } from '@/services';
import { MessageStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
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

    const isMember = await conversationService.isMember(conversationId, userProfile.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const messages = await messageService.findByConversationId(conversationId);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { conversationId, text } = await request.json();

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'conversationId and text required' }, { status: 400 });
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

    const isMember = await conversationService.isMember(conversationId, userProfile.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const message = await messageService.create({
      conversation: { connect: { id: conversationId } },
      sender: { connect: { id: userProfile.id } },
      type: 'text',
      text,
      status: MessageStatus.enviada,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
