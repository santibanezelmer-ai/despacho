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
  isPendingValidation: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  canWrite: boolean;
  retryValidation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isPendingValidation, setIsPendingValidation] = useState(false);
  const authBootstrappedRef = useRef(false);
  const manualLogoutRef = useRef(false);

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

  const bootstrapAuth = async () => {
    if (manualLogoutRef.current) return;

    let { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession && !manualLogoutRef.current) {
      const restoreResult = await restoreNativeAuthSession();
      if (manualLogoutRef.current) return; // Abort if user logged out during restore

      if (restoreResult.state === 'AUTHENTICATED' && restoreResult.session) {
        currentSession = restoreResult.session;
        setIsPendingValidation(false);
      } else if (restoreResult.state === 'PENDING_VALIDATION') {
        setIsPendingValidation(true);
        currentSession = null;
      } else {
        setIsPendingValidation(false);
        currentSession = null;
      }
    } else {
      setIsPendingValidation(false);
    }

    if (currentSession) {
      await persistNativeAuthSession(currentSession);
    } else if (!authBootstrappedRef.current && !isPendingValidation) {
      console.warn('[Auth] No active session found during bootstrap');
    }

    if (manualLogoutRef.current) return;

    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      fetchRoles(currentSession.user.id);
      fetchSuperadmin(currentSession.user.id);
    } else {
      setRoles([]);
      setIsSuperadmin(false);
    }

    authBootstrappedRef.current = true;
    setLoading(false);
  };

  const retryValidation = async () => {
    if (!isPendingValidation) return;
    setLoading(true);
    await bootstrapAuth();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, changedSession) => {
      if (manualLogoutRef.current) {
         // Ignore all auth state changes if we are explicitly logged out, until a new SIGNED_IN
         if (event === 'SIGNED_IN') {
           manualLogoutRef.current = false;
         } else {
           return;
         }
      }

      setSession(changedSession);
      const nextUser = changedSession?.user ?? null;
      setUser(prev => (prev && nextUser && prev.id === nextUser.id ? prev : nextUser));

      if (changedSession) {
        void persistNativeAuthSession(changedSession);
        setIsPendingValidation(false);
      }

      if (event === 'TOKEN_REFRESHED' && authBootstrappedRef.current) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.warn('[Auth] SIGNED_OUT recibido. Se permite que Supabase limpie la sesión.');
        await clearNativeAuthSession();
        setIsPendingValidation(false);
      }

      if (changedSession?.user) {
        setTimeout(() => {
          if (manualLogoutRef.current) return;
          fetchRoles(changedSession.user.id);
          fetchSuperadmin(changedSession.user.id);
        }, 0);
      } else {
        setRoles([]);
        setIsSuperadmin(false);
      }

      authBootstrappedRef.current = true;
      setLoading(false);
    });

    // Run bootstrap
    bootstrapAuth();

    // Listen for network reconnection to retry validation
    const handleOnline = () => {
      if (isPendingValidation) {
        retryValidation();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [isPendingValidation]);

  const signIn = async (email: string, password: string) => {
    manualLogoutRef.current = false;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    manualLogoutRef.current = false;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    manualLogoutRef.current = true; // 1. Señal explícita de cierre
    setIsPendingValidation(false); // Invalidar restauraciones pendientes

    try {
      await unregisterDeviceToken(); // No permitir que un error de FCM bloquee
    } catch (e) {
      console.warn('[Auth] Error in unregisterDeviceToken during logout:', e);
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Auth] Error during Supabase signOut:', e);
    }

    await clearNativeAuthSession();

    setUser(null);
    setSession(null);
    setRoles([]);
    setIsSuperadmin(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const canWrite = hasRole('admin') || hasRole('operador') || hasRole('oficial');

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, isSuperadmin, isPendingValidation, signIn, signUp, signOut, hasRole, canWrite, retryValidation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

