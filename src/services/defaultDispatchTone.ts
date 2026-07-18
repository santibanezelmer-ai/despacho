// Default dispatch tone for the Voluntario PWA.
// Plays a preloaded MP3 by default; users can override the tone URL
// per-device via localStorage ('voluntario_custom_tone_url').

import defaultToneAsset from '@/assets/dispatch-tone.mp3.asset.json';

export const DEFAULT_DISPATCH_TONE_URL = defaultToneAsset.url;
export const CUSTOM_TONE_KEY = 'voluntario_custom_tone_url';
const SOUND_ENABLED_KEY = 'voluntario_sound_enabled';

export function getActiveDispatchToneUrl(): string {
  try {
    const custom = localStorage.getItem(CUSTOM_TONE_KEY);
    if (custom && custom.trim()) return custom;
  } catch { /* ignore */ }
  return DEFAULT_DISPATCH_TONE_URL;
}

/** Play the configured dispatch tone. Safe to call from foreground handlers. */
export function playDefaultDispatchTone() {
  try {
    if (localStorage.getItem(SOUND_ENABLED_KEY) === 'false') return;
  } catch { /* ignore */ }

  try {
    const audio = new Audio(getActiveDispatchToneUrl());
    audio.volume = 1;
    audio.play().catch(() => {
      // Autoplay blocked — fallback silent
    });
  } catch { /* ignore */ }

  if ('vibrate' in navigator) {
    try { navigator.vibrate([400, 150, 400, 150, 400]); } catch { /* ignore */ }
  }
}
