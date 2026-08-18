import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { EmergencyKeyRow } from '@/hooks/useEmergencyKeys';

const STORAGE_KEY = 'operix.dispatch.open-key';

interface DispatchFormCtx {
  openKey: EmergencyKeyRow | null;
  openDispatch: (key: EmergencyKeyRow) => void;
  closeDispatch: () => void;
}

const Ctx = createContext<DispatchFormCtx>({
  openKey: null,
  openDispatch: () => {},
  closeDispatch: () => {},
});

export function DispatchFormProvider({ children }: { children: React.ReactNode }) {
  const [openKey, setOpenKey] = useState<EmergencyKeyRow | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as EmergencyKeyRow) : null;
    } catch {
      // Sin borrador previo válido: se abre limpio
      return null;
    }
  });

  useEffect(() => {
    try {
      if (openKey) localStorage.setItem(STORAGE_KEY, JSON.stringify(openKey));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible: la ventana sigue funcionando en memoria
    }
  }, [openKey]);

  const openDispatch = useCallback((key: EmergencyKeyRow) => setOpenKey(key), []);
  const closeDispatch = useCallback(() => setOpenKey(null), []);

  const value = useMemo(() => ({ openKey, openDispatch, closeDispatch }), [openKey, openDispatch, closeDispatch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDispatchForm() {
  return useContext(Ctx);
}

export const DISPATCH_DRAFT_KEY = 'operix.dispatch.draft';
