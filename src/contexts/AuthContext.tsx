import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { clearNativeAuthSession, persistNativeAuthSession, restoreNativeAuthSession } from '@/services/nativeAuthStorage';
import { unregisterDeviceToken } from '@/services/pushService';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

type AppRole = 'admin' | 'operador' | 'oficial' | 'visor';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isSuperadmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const authBootstrappedRef = useRef(false);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.rpc('get_user_roles', { _user_id: userId });
    if (data) setRoles(data as AppRole[]);
  };

  const fetchSuperadmin = async (userId: string) => {
    const { data } = await (supabase as any)
      .from('superadmins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsSuperadmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      // Al volver a la pestaña llegan TOKEN_REFRESHED/SIGNED_IN con un objeto
      // user nuevo del mismo usuario: conservarlo evita recargar toda la app.
      const nextUser = session?.user ?? null;
      setUser(prev => (prev && nextUser && prev.id === nextUser.id ? prev : nextUser));
      // Persistir siempre (incluido TOKEN_REFRESHED): el refresh token rota y el
      // respaldo nativo debe tener el vigente para poder restaurar la sesión.
      if (session) {
        // Now handled by Supabase storage natively, but kept for legacy sync just in case
        void persistNativeAuthSession(session);
      }

      if (event === 'TOKEN_REFRESHED' && authBootstrappedRef.current) {
        return;
      }

      if (session) {
        // ya persistida arriba
      } else if (event === 'SIGNED_OUT') {
        console.warn('[Auth] SIGNED_OUT recibido; se conserva el respaldo nativo');
      }

      if (session?.user) {
        setTimeout(() => {
          fetchRoles(session.user.id);
          fetchSuperadmin(session.user.id);
        }, 0);
      } else {
        setRoles([]);
        setIsSuperadmin(false);
      }

      authBootstrappedRef.current = true;
      setLoading(false);
    });

    (async () => {
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        session = await restoreNativeAuthSession();
      }

      if (session) {
        await persistNativeAuthSession(session);
      } else if (!authBootstrappedRef.current) {
        console.warn('[Auth] No active session found during bootstrap');
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
        fetchSuperadmin(session.user.id);
      }
      authBootstrappedRef.current = true;
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // 1. Eliminar token de la base de datos ANTES de destruir la sesión
    await unregisterDeviceToken();

    // Permitir el borrado en el storage nativo
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: 'operix_intentional_logout', value: 'true' });
    }

    // 2. Destruir sesión en Supabase y de forma local
    await supabase.auth.signOut();
    await clearNativeAuthSession();
    setRoles([]);
    setIsSuperadmin(false);

    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'operix_intentional_logout' });
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const canWrite = hasRole('admin') || hasRole('operador') || hasRole('oficial');

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, isSuperadmin, signIn, signUp, signOut, hasRole, canWrite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
