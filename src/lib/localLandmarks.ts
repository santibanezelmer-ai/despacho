export type LocalLandmark = {
  id: string;
  name: string;
  aliases: string[];
  category: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
};

export const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Busca puntos locales por nombre o apodo (todas las palabras deben coincidir). Instantáneo, sin red. */
export function matchLocalLandmarks(query: string, list: LocalLandmark[], limit = 5): LocalLandmark[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored: { l: LocalLandmark; score: number }[] = [];
  for (const l of list) {
    let best = 0;
    for (const term of [l.name, ...(l.aliases ?? [])]) {
      const t = normalizeText(term);
      if (!t) continue;
      if (t === q) best = Math.max(best, 3);
      else if (t.startsWith(q)) best = Math.max(best, 2);
      else if (words.every(w => t.includes(w))) best = Math.max(best, 1);
    }
    if (best > 0) scored.push({ l, score: best });
  }
  return scored.sort((a, b) => b.score - a.score || a.l.name.localeCompare(b.l.name)).slice(0, limit).map(s => s.l);
}

export const parseAliases = (s: string) => s.split(',').map(a => a.trim()).filter(Boolean);
