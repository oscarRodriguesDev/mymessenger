import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService, userService } from '@/services';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Apenas admin pode remover membros (ou o próprio usuário pode sair)
    const members = await conversationService.getMembers(id);
    const currentMember = members.find((m) => m.user.id === userProfile.id);
    const isAdmin = currentMember?.role === 'admin';
    const isSelfRemoval = userId === userProfile.id;

    if (!isAdmin && !isSelfRemoval) {
      return NextResponse.json({ error: 'Only group admin can remove members' }, { status: 403 });
    }

    if (!currentMember && !isSelfRemoval) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Não permitir remover o admin (a menos que seja ele mesmo saindo)
    const targetMember = members.find((m) => m.user.id === userId);
    if (targetMember?.role === 'admin' && !isSelfRemoval) {
      return NextResponse.json({ error: 'Cannot remove group admin' }, { status: 403 });
    }

    await conversationService.removeMember(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
