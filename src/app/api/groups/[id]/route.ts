import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { conversationService, userService } from '@/services';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isMember = await conversationService.isMember(id, userProfile.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const conversation = await conversationService.findById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await conversationService.getMembers(id);

    return NextResponse.json({ ...conversation, members });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Apenas o admin pode atualizar o grupo
    const members = await conversationService.getMembers(id);
    const currentMember = members.find((m) => m.user.id === userProfile.id);
    if (!currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admin can update' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await conversationService.update(id, updateData);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Apenas o admin pode deletar o grupo
    const members = await conversationService.getMembers(id);
    const currentMember = members.find((m) => m.user.id === userProfile.id);
    if (!currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admin can delete' }, { status: 403 });
    }

    await conversationService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
