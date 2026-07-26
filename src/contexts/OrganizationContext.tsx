import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { logClientError } from '@/lib/clientErrorLogger';

// Dev-only: detect multiple copies of this module being loaded (e.g. mismatched
// import paths like '@/contexts/OrganizationContext' vs a relative path), which
// causes Provider/hook to use different Context instances and produce the
// "must be used within OrganizationProvider" error.
declare global {
  // eslint-disable-next-line no-var
  var __ORG_CONTEXT_MODULE_ID__: string | undefined;
}
if (import.meta.env.DEV) {
  const moduleId = `${import.meta.url}#${Math.random().toString(36).slice(2, 8)}`;
  if (globalThis.__ORG_CONTEXT_MODULE_ID__ && globalThis.__ORG_CONTEXT_MODULE_ID__ !== moduleId) {
    // eslint-disable-next-line no-console
    console.warn(
      '[OrganizationContext] ⚠️ Multiple copies of OrganizationContext detected!\n' +
        `Previous: ${globalThis.__ORG_CONTEXT_MODULE_ID__}\n` +
        `Current:  ${moduleId}\n` +
        'Provider and useOrganization() must come from the same module path. ' +
        "Check for mixed imports like '@/contexts/OrganizationContext' vs './OrganizationContext'."
    );
  }
  globalThis.__ORG_CONTEXT_MODULE_ID__ = moduleId;
}

type OrgRole = 'admin' | 'operador' | 'oficial' | 'visor' | 'voluntario';

interface OrgMembership {
  organization_id: string;
  role: OrgRole;
  status: string;
  company_id: string | null;
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
  /** True when the current user is a full org admin (role=admin AND no company scope). */
  isFullOrgAdmin: boolean;
  /** True when the current user is scoped to a single company (role=admin + company_id). */
  isCompanyAdmin: boolean;
  /** company_id the user is scoped to, or null if not company-scoped. */
  scopedCompanyId: string | null;
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
  if (!ctx) {
    const err = new Error('useOrganization must be used within OrganizationProvider');
    // Fire-and-forget remote log (no orgId available, so this just hits console)
    logClientError({
      kind: 'missing_org_provider',
      message: err.message,
      stack: err.stack,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    throw err;
  }
  return ctx;
}

/**
 * Safe variant: returns null instead of throwing when used outside of
 * OrganizationProvider. Use this in components that may render before the
 * provider tree is ready (e.g. very-early routes / fallback UIs).
 */
export function useOrganizationOptional() {
  return useContext(OrganizationContext);
}
