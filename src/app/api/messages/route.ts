import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messageService, userService, conversationService, reactionService } from '@/services';
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

    // Incluir contagem de reações para cada mensagem
    const messageIds = messages.map((m) => m.id);
    const reactionCounts = await reactionService.getMessagesReactions(messageIds);

    const messagesWithReactions = messages.map((m) => ({
      ...m,
      reactions: reactionCounts[m.id] || {},
    }));

    return NextResponse.json(messagesWithReactions);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { conversationId, text, clientMessageId, fileUrl, mimeType, fileSize, fileName, expiresAt } = await request.json();

    // Pelo menos text ou fileUrl é necessário
    if (!conversationId || (!text && !fileUrl)) {
      return NextResponse.json({ error: 'conversationId and text or fileUrl required' }, { status: 400 });
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

    // ── Item 13: Deduplicação por clientMessageId ──
    if (clientMessageId) {
      const existing = await messageService.findByClientMessageId(userProfile.id, clientMessageId);
      if (existing) {
        // Mensagem já foi enviada — retorna a existente (idempotente)
        return NextResponse.json(existing);
      }
    }

    // Determinar o type da mensagem
    let messageType = 'text';
    if (fileUrl) {
      if (mimeType?.startsWith('image/')) messageType = 'image';
      else if (mimeType?.startsWith('video/')) messageType = 'video';
      else if (mimeType?.startsWith('audio/')) messageType = 'audio';
      else messageType = 'file';
    }

    const message = await messageService.create({
      conversation: { connect: { id: conversationId } },
      sender: { connect: { id: userProfile.id } },
      type: messageType,
      text: text || null,
      fileUrl: fileUrl || null,
      mimeType: mimeType || null,
      fileSize: fileSize || null,
      fileName: fileName || null,
      status: MessageStatus.enviada,
      ...(clientMessageId ? { clientMessageId } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
