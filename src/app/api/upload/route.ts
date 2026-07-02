import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { userService } from '@/services';

const BUCKET_NAME = 'photoProfile';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar profile para pegar o ID do usuário no banco
    const profile = await userService.findByAuthId(authUser.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo do arquivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato inválido. Use PNG, JPEG ou WebP.' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    // Nome do arquivo: {userId}.png (sempre PNG para sobrescrever)
    const fileExtension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${profile.id}.${fileExtension}`;
    const filePath = fileName;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Usar service role client para upload (contorna RLS)
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload com upsert para substituir arquivo existente
    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: publicUrlData } = serviceClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    // Atualizar avatarUrl no banco
    const updatedProfile = await userService.update(profile.id, { avatarUrl });

    return NextResponse.json({
      avatarUrl: updatedProfile.avatarUrl,
      message: 'Avatar atualizado com sucesso',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
