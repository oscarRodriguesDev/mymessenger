import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { circleService, userService } from '@/services';

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

    // Verificar se o usuário a ser adicionado existe
    const userToAdd = await userService.findById(userId);
    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const member = await circleService.addMember(id, userId, userProfile.id);

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message === 'Circle not found' ? 404 :
      message === 'Not a member of this circle' ? 403 :
      message === 'User is already a member' ? 409 :
      500;

    console.error('Add circle member error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
