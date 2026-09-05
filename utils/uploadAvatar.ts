import { File } from 'expo-file-system';
import { supabase } from '../firebase/supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_EXTENSIONS = ['jpg', 'png', 'webp'] as const;

export async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Could not read image data from device.');
  }

  return buffer;
}

export function getImageUploadMeta(mimeType?: string | null) {
  const type = mimeType || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return { contentType: type, extension: ext };
}

export function getAvatarFileName(userId: string, extension: string) {
  return `${userId}.${extension}`;
}

export function getAvatarPublicUrl(userId: string, extension: string) {
  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(getAvatarFileName(userId, extension));
  return data.publicUrl;
}

export async function removeExistingAvatars(userId: string) {
  const paths = AVATAR_EXTENSIONS.map((ext) => getAvatarFileName(userId, ext));
  await supabase.storage.from(AVATAR_BUCKET).remove(paths);
}

export async function uploadAvatarFile(
  userId: string,
  arrayBuffer: ArrayBuffer,
  contentType: string,
  extension: string
) {
  const fileName = getAvatarFileName(userId, extension);

  await removeExistingAvatars(userId);

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(fileName, arrayBuffer, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });

  if (error) {
    if (error.message.toLowerCase().includes('row-level security')) {
      throw new Error(
        'Avatar upload blocked by Supabase storage policy. Run scripts/supabase-avatars-policy.sql in your Supabase SQL Editor, then try again.'
      );
    }
    throw error;
  }

  return getAvatarPublicUrl(userId, extension);
}

export function resolveStoredAvatarUrl(
  firestoreUrl?: string | null,
  storedExtension?: string | null,
  userId?: string | null
) {
  if (firestoreUrl) return firestoreUrl;
  if (userId && storedExtension) return getAvatarPublicUrl(userId, storedExtension);
  return null;
}