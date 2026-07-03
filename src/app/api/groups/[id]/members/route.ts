import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService, userService } from '@/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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

    // Apenas admin pode adicionar membros
    const members = await conversationService.getMembers(id);
    const currentMember = members.find((m) => m.user.id === userProfile.id);
    if (!currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admin can add members' }, { status: 403 });
    }

    // Verificar se o usuário já é membro
    const isAlreadyMember = members.some((m) => m.user.id === userId);
    if (isAlreadyMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    // Verificar se o usuário existe
    const userToAdd = await userService.findById(userId);
    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const member = await conversationService.addMember(id, userId);

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
