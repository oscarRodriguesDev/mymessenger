import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/services';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await userService.findByAuthId(authUser.id);
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validar tipo (imagem, vídeo, áudio, documento)
    const supportedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm',
      'audio/webm;codecs=opus', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a',
      'application/pdf',
    ];

    // Normalizar mimeType: remove codecs para match mais flexível
    const normalizeMime = (t: string) => t.split(';')[0].trim();
    const fileBaseType = normalizeMime(file.type);
    const isSupported = supportedTypes.some(supported =>
      normalizeMime(supported) === fileBaseType || supported === file.type
    );

    if (!isSupported) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Limite de 20MB
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max 20MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${userProfile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { data, error: uploadError } = await supabase.storage
      .from('message-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Obter URL pública
    const { data: publicData } = supabase.storage
      .from('message-media')
      .getPublicUrl(fileName);

    return NextResponse.json({
      fileUrl: publicData.publicUrl,
      mimeType: file.type,
      fileSize: file.size,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}