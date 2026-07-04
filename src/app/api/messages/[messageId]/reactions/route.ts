import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reactionService, userService } from '@/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const { emoji } = await request.json();

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'emoji is required' }, { status: 400 });
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

    const result = await reactionService.toggle(messageId, userProfile.id, emoji);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Reaction toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reactions = await reactionService.getReactions(messageId);
    return NextResponse.json(reactions);
  } catch (error) {
    console.error('Get reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
