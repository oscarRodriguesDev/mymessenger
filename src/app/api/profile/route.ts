import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/services';

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, username, bio, phone, discoverableByPhone, discoverableByUsername } = body;

    // Buscar profile atual
    const currentProfile = await userService.findByAuthId(authUser.id);
    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verificar se username já está em uso (se foi alterado)
    if (username && username !== currentProfile.username) {
      const existingUser = await userService.findByUsername(username);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Este nome de usuário já está em uso' },
          { status: 409 }
        );
      }
    }

    // Verificar se phone já está em uso (se foi alterado)
    if (phone && phone !== currentProfile.phone) {
      const existingUser = await userService.findByPhone(phone);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Este telefone já está em uso' },
          { status: 409 }
        );
      }
    }

    const updatedProfile = await userService.update(currentProfile.id, {
      ...(fullName !== undefined && { fullName }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(phone !== undefined && { phone }),
      ...(discoverableByPhone !== undefined && { discoverableByPhone }),
      ...(discoverableByUsername !== undefined && { discoverableByUsername }),
    });

    return NextResponse.json({
      id: updatedProfile.id,
      authId: updatedProfile.authId,
      username: updatedProfile.username,
      fullName: updatedProfile.fullName,
      email: updatedProfile.email,
      avatarUrl: updatedProfile.avatarUrl,
      bio: updatedProfile.bio,
      phone: updatedProfile.phone,
      discoverableByPhone: updatedProfile.discoverableByPhone,
      discoverableByUsername: updatedProfile.discoverableByUsername,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
