import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type OrgRole = 'admin' | 'operador' | 'oficial' | 'visor';

interface OrgMembership {
  organization_id: string;
  role: OrgRole;
  status: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logo_url: string | null;
    is_demo?: boolean;
    demo_expires_at?: string | null;
  };
}

interface OrganizationContextType {
  memberships: OrgMembership[];
  currentOrg: OrgMembership | null;
  orgId: string | null;
  orgRole: OrgRole | null;
  canWrite: boolean;
  isOrgAdmin: boolean;
  loading: boolean;
  setCurrentOrgId: (id: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, slug, status, logo_url, is_demo, demo_expires_at)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        const mapped: OrgMembership[] = (data as any[]).map((m: any) => ({
          organization_id: m.organization_id,
          role: m.role,
          status: m.status,
          organization: m.organizations,
        }));
        setMemberships(mapped);
        setCurrentOrgId(prev => {
          if (!prev && mapped.length > 0) {
            const active = mapped.find(m => m.organization?.status === 'active');
            return active?.organization_id ?? mapped[0].organization_id;
          }
          return prev;
        });
      }
      setLoading(false);
    };

    fetchMemberships();
  }, [user]);

  const currentOrg = memberships.find(m => m.organization_id === currentOrgId) ?? null;
  const orgRole = currentOrg?.role ?? null;
  const canWrite = orgRole === 'admin' || orgRole === 'operador' || orgRole === 'oficial';
  const isOrgAdmin = orgRole === 'admin';

  return (
    <OrganizationContext.Provider value={{
      memberships, currentOrg, orgId: currentOrgId, orgRole, canWrite, isOrgAdmin, loading, setCurrentOrgId,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}
