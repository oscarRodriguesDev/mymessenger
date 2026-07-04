-- Políticas RLS para o bucket message-media
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- 1. Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('message-media', 'message-media', true, false, 20971520, '{"image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm","audio/mp3","audio/ogg","audio/wav","audio/webm","application/pdf"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Política INSERT: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-media'
  AND auth.role() = 'authenticated'
);

-- 3. Política SELECT: qualquer pessoa pode visualizar/download
CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'message-media');

-- 4. Política DELETE: usuários podem deletar seus próprios uploads
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Política UPDATE: usuários podem atualizar seus próprios uploads
CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
