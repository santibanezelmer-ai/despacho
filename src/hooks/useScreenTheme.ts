import { useCallback, useEffect, useState } from 'react';

const themeEvent = 'operix:screen-theme';

/**
 * Tema claro/oscuro por pantalla, guardado en localStorage.
 * Se aplica con data-theme en el contenedor raíz de cada vista.
 */
export function useScreenTheme(storageKey: string) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const syncTheme = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== storageKey) return;
      if (event instanceof CustomEvent && event.detail !== storageKey) return;
      try { setTheme(localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'); } catch { /* ignore */ }
    };
    window.addEventListener('storage', syncTheme);
    window.addEventListener(themeEvent, syncTheme);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(themeEvent, syncTheme);
    };
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(storageKey, next);
        window.dispatchEvent(new CustomEvent(themeEvent, { detail: storageKey }));
      } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return { theme, toggleTheme };
}
