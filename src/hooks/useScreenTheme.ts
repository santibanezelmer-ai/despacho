import { useCallback, useState } from 'react';

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

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(storageKey, next); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return { theme, toggleTheme };
}
