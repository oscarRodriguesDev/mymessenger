import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vibeService, userService } from '@/services';

export async function POST(request: Request) {
  try {
    const { receiverId, type, conversationId } = await request.json();

    if (!receiverId || !type) {
      return NextResponse.json(
        { error: 'receiverId and type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['buzz', 'poke', 'wave', 'heartbeat', 'fire'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid vibe type. Valid: ' + validTypes.join(', ') },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const senderProfile = await userService.findByAuthId(authUser.id);
    if (!senderProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Não pode enviar vibe para si mesmo
    if (senderProfile.id === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send vibe to yourself' },
        { status: 400 }
      );
    }

    // Verificar se o receptor existe
    const receiver = await userService.findById(receiverId);
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Verificar se não está bloqueado
    const blocked = await vibeService.isBlocked(senderProfile.id, receiverId);
    if (blocked) {
      return NextResponse.json({ error: 'You are blocked by this user' }, { status: 403 });
    }

    // Verificar se o remetente bloqueou o receptor
    const blockedBySender = await vibeService.isBlocked(receiverId, senderProfile.id);
    if (blockedBySender) {
      return NextResponse.json({ error: 'You blocked this user' }, { status: 403 });
    }

    // Criar o sinal
    const signal = await vibeService.sendSignal(
      senderProfile.id,
      receiverId,
      type,
      conversationId
    );

    // Se houver conversationId, cria mensagem de sistema
    if (conversationId) {
      await vibeService.createSystemMessage(conversationId, senderProfile.id, type);
    }

    return NextResponse.json({ sent: true, signal });
  } catch (error) {
    console.error('Send vibe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
