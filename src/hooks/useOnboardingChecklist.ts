import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface OnboardingItem {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  navigateTo: string;
}

export function useOnboardingChecklist() {
  const { orgId, currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['onboarding-checklist', orgId],
    queryFn: async (): Promise<OnboardingItem[]> => {
      if (!orgId) return [];

      // Fetch full org data for config check
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, status, phone, institution_email, address, logo_url')
        .eq('id', orgId)
        .single();

      const orgConfigured = !!(
        orgData?.name &&
        orgData?.status === 'active' &&
        (orgData?.phone || orgData?.institution_email || orgData?.address || orgData?.logo_url)
      );

      // Check counts in parallel
      const [companies, volunteers, vehicles, keys, emergencies] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('volunteers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('emergency_keys').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('emergencies').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      return [
        {
          key: 'org',
          title: 'Organización configurada',
          description: 'Nombre, estado activo y al menos un dato de contacto (teléfono, email, dirección o logo)',
          completed: orgConfigured,
          navigateTo: '/admin',
        },
        {
          key: 'companies',
          title: 'Compañías creadas',
          description: 'Al menos una compañía registrada en tu organización',
          completed: (companies.count ?? 0) > 0,
          navigateTo: '/companias',
        },
        {
          key: 'volunteers',
          title: 'Voluntarios cargados',
          description: 'Al menos un voluntario registrado en tu organización',
          completed: (volunteers.count ?? 0) > 0,
          navigateTo: '/voluntarios',
        },
        {
          key: 'vehicles',
          title: 'Móviles registrados',
          description: 'Al menos un móvil registrado en tu organización',
          completed: (vehicles.count ?? 0) > 0,
          navigateTo: '/moviles',
        },
        {
          key: 'keys',
          title: 'Claves de emergencia creadas',
          description: 'Al menos una clave de emergencia configurada',
          completed: (keys.count ?? 0) > 0,
          navigateTo: '/claves',
        },
        {
          key: 'dispatch',
          title: 'Primer despacho realizado',
          description: 'Al menos una emergencia creada desde la consola de despacho',
          completed: (emergencies.count ?? 0) > 0,
          navigateTo: '/',
        },
      ];
    },
    enabled: !!orgId,
    staleTime: 30000,
  });
}
