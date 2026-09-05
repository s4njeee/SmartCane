-- Run this in Supabase Dashboard → SQL Editor
-- Fixes: "new row violates row-level security policy" on avatar uploads
-- The app uses Firebase Auth + Supabase anon key, so uploads run as the "anon" role.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Anon avatar insert" ON storage.objects;
DROP POLICY IF EXISTS "Anon avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Anon avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Auth avatar insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Auth avatar delete" ON storage.objects;

CREATE POLICY "Public avatar read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Anon avatar insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anon avatar update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anon avatar delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'avatars');

CREATE POLICY "Auth avatar insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Auth avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Auth avatar delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');