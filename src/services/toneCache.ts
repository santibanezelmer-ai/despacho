import { resolveToneUrl } from '@/lib/toneUrl';

const CACHE_NAME = 'operix-tones-v1';

/** Clave estable: la URL sin parámetros (los enlaces firmados cambian). */
function keyFor(url: string) {
  return `https://operix-tone-cache.local/${encodeURIComponent(url.split('?')[0])}`;
}

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** Descarga y guarda un tono para usarlo sin conexión. */
export async function precacheTone(url: string | null | undefined): Promise<void> {
  if (!url || !navigator.onLine) return;
  const cache = await openCache();
  if (!cache) return;
  const key = keyFor(url);
  if (await cache.match(key)) return;
  try {
    const src = (await resolveToneUrl(url)) ?? url;
    const res = await fetch(src);
    if (res.ok) await cache.put(key, res);
  } catch {
    // Sin red o archivo inaccesible: se reintentará en la próxima carga
  }
}

export async function precacheTones(urls: (string | null | undefined)[]) {
  const unique = Array.from(new Set(urls.filter(Boolean) as string[]));
  for (const u of unique) await precacheTone(u);
}

/** Devuelve una fuente reproducible: primero caché local, luego red. */
export async function getPlayableToneSrc(url: string): Promise<string> {
  const cache = await openCache();
  if (cache) {
    const hit = await cache.match(keyFor(url));
    if (hit) {
      try {
        return URL.createObjectURL(await hit.blob());
      } catch {
        /* sigue con la red */
      }
    }
  }
  if (navigator.onLine) {
    void precacheTone(url);
    return (await resolveToneUrl(url)) ?? url;
  }
  return url;
}
