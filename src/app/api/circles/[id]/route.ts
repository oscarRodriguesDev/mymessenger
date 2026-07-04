import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { circleService, userService } from '@/services';
import { prisma } from '@/lib/prisma';

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

    const isMember = await circleService.isMember(id, userProfile.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    const circle = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ ...circle, members });
  } catch (error) {
    console.error('Get circle error:', error);
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

    const result = await circleService.removeMember(id, userProfile.id, userProfile.id);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Remove circle member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const isMember = await circleService.isMember(id, userProfile.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    await circleService.extendTTL(id);

    return NextResponse.json({ success: true, message: 'TTL extended to +7 days' });
  } catch (error) {
    console.error('Extend TTL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


