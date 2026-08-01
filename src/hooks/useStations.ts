import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCompanies } from '@/hooks/useCompanies';

export type MapStation = {
  id: string;
  latitude: number;
  longitude: number;
  /** Nombres que comparten esta misma ubicación (org y/o compañías) */
  labels: string[];
  address: string | null;
};

/** Redondeo a ~1 metro para agrupar ubicaciones idénticas o casi idénticas. */
const keyOf = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

export function useOrganizationLocation() {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['org-location', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('id, name, address, latitude, longitude')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null };
    },
  });
}

/**
 * Cuarteles a mostrar en el mapa: dirección de la organización + de cada compañía.
 * Si varias comparten las mismas coordenadas, se devuelve un único marcador.
 */
export function useStations() {
  const { data: org } = useOrganizationLocation();
  const { data: companies } = useCompanies();

  const stations = useMemo<MapStation[]>(() => {
    const map = new Map<string, MapStation>();

    const push = (
      id: string,
      lat: number | null | undefined,
      lng: number | null | undefined,
      label: string,
      address: string | null
    ) => {
      if (lat == null || lng == null) return;
      const key = keyOf(lat, lng);
      const existing = map.get(key);
      if (existing) {
        if (!existing.labels.includes(label)) existing.labels.push(label);
        if (!existing.address && address) existing.address = address;
        return;
      }
      map.set(key, { id, latitude: lat, longitude: lng, labels: [label], address: address ?? null });
    };

    if (org) push(`org-${org.id}`, org.latitude, org.longitude, org.name, org.address);

    (companies ?? []).forEach((c: any) => {
      if (c.active === false) return;
      push(`company-${c.id}`, c.latitude, c.longitude, `Cía. ${c.number} — ${c.name}`, c.address ?? null);
    });

    return Array.from(map.values());
  }, [org, companies]);

  return stations;
}
