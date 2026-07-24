import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'logos';
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Resolve a stored `logo_url` value (either a full URL or a storage path
 * inside the private `logos` bucket) to a URL usable by <img> / PDF renderers.
 * Returns null when the value is empty or resolution fails.
 */
export async function resolveLogoUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const cached = cache.get(value);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  cache.set(value, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL - 300) * 1000 });
  return data.signedUrl;
}

export interface UploadLogoParams {
  file: File;
  orgId: string;
  /** 'org' for the organization logo, 'company' for a company logo. */
  kind: 'org' | 'company';
  /** Company id when kind='company'. Ignored otherwise. */
  subId?: string;
}

export async function uploadLogo({ file, orgId, kind, subId }: UploadLogoParams): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');
  if (file.size > 3 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 3 MB');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const stamp = Date.now();
  const prefix = kind === 'org' ? 'org' : `company-${subId ?? 'x'}`;
  const path = `${orgId}/${prefix}-${stamp}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function deleteLogoPath(pathOrUrl?: string | null): Promise<void> {
  if (!pathOrUrl) return;
  if (/^(https?:|data:|blob:)/i.test(pathOrUrl)) return; // not managed here
  await supabase.storage.from(BUCKET).remove([pathOrUrl]);
  cache.delete(pathOrUrl);
}

/** Fetch and encode an image URL as a base64 data URL (used by jsPDF). */
export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
