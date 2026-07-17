// Default dispatch tone for the Voluntario PWA — played on every mobile
// when a new emergency arrives, regardless of org-specific sound config.
// Uses the Web Audio API so it works without shipping an MP3 asset.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

/** Play a two-tone siren-like alert. Safe to call from foreground handlers. */
export function playDefaultDispatchTone() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.connect(ac.destination);

  const beeps: Array<[number, number]> = [
    [880, 0.35],
    [660, 0.35],
    [880, 0.35],
    [660, 0.35],
  ];
  let t = now;
  for (const [freq, dur] of beeps) {
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + 0.05;
  }

  if ('vibrate' in navigator) {
    try { navigator.vibrate([400, 150, 400, 150, 400]); } catch { /* ignore */ }
  }
}
