import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messageService, userService, conversationService } from '@/services';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const { status } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json({ error: 'messageId and status required' }, { status: 400 });
    }

    if (!['sent', 'delivered', 'read'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
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

    // Verifica se a mensagem existe e se o usuário é o destinatário
    const message = await messageService.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Só o destinatário pode marcar como delivered/read
    if (message.senderId === userProfile.id) {
      return NextResponse.json({ error: 'Only recipient can update status' }, { status: 403 });
    }

    // Se for 'read', marca como lida
    if (status === 'read') {
      await messageService.markAsRead(messageId, userProfile.id);
    } else {
      // Atualiza status diretamente
      await messageService.updateStatus(messageId, status as 'sent' | 'delivered' | 'read');
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Update message status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}