import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { clearNativeAuthSession, persistNativeAuthSession, restoreNativeAuthSession } from '@/services/nativeAuthStorage';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      void persistNativeAuthSession(session ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchRoles(session.user.id);
          fetchSuperadmin(session.user.id);
        }, 0);
      } else {
        setRoles([]);
        setIsSuperadmin(false);
      }
      setLoading(false);
    });

    (async () => {
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        session = await restoreNativeAuthSession();
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
        fetchSuperadmin(session.user.id);
      }
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
    await supabase.auth.signOut();
    await clearNativeAuthSession();
    setRoles([]);
    setIsSuperadmin(false);
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
