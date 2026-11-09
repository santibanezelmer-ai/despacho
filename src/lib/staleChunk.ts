// Detecta errores por archivos de una versión anterior (tras publicar) y
// recarga la página una sola vez para traer la versión vigente.
const KEY = 'operix:stale-chunk-reload';
const WINDOW_MS = 30_000;

export function isStaleChunkError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed/i.test(message);
}

/** Recarga una vez; devuelve false si ya se recargó hace poco (evita bucles). */
export function reloadForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* sin storage: recargar igual */ }
  window.location.reload();
  return true;
}
