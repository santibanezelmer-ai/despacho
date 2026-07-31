import { supabase } from '@/integrations/supabase/client';

const TONES_BUCKET = 'tones';

/**
 * Legacy rows store PUBLIC storage URLs, but the `tones` bucket is now private,
 * so those URLs return 400 and the audio never plays. This resolves any stored
 * tone URL into a fresh signed URL at playback time.
 */
export async function resolveToneUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  // Not a Supabase storage URL for the tones bucket → use as-is.
  const marker = `/storage/v1/object/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  let rest = url.slice(idx + marker.length); // e.g. "public/tones/x.mp3" or "sign/tones/x.mp3?token=..."
  rest = rest.replace(/^(public|sign|authenticated)\//, '');
  if (!rest.startsWith(`${TONES_BUCKET}/`)) return url;

  const path = rest.slice(TONES_BUCKET.length + 1).split('?')[0];
  if (!path) return url;

  const { data, error } = await supabase.storage
    .from(TONES_BUCKET)
    .createSignedUrl(decodeURIComponent(path), 60 * 60);

  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}
