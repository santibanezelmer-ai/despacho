import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Reads everything that already exists about a volunteer from the modules
 * that own the data (Capacitaciones, Equipamiento, Operaciones / Personal por
 * Móvil, Hoja de vida). Nothing is duplicated here — it is read-only joining.
 */
export function useVolunteerProfile(volunteerId?: string | null) {
  const { orgId } = useOrganization();
  const enabled = !!volunteerId && !!orgId;

  const training = useQuery({
    queryKey: ['volunteer-training', volunteerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training')
        .select('*')
        .eq('volunteer_id', volunteerId!)
        .order('date_completed', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const equipment = useQuery({
    queryKey: ['volunteer-equipment', volunteerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('equipment')
        .select('id, name, quantity, condition, assigned_at, notes, vehicles(code, type)')
        .eq('assigned_volunteer_id', volunteerId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const attendance = useQuery({
    queryKey: ['volunteer-attendance', volunteerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('emergency_personnel')
        .select(`
          id, role, assigned_at,
          emergencies(id, folio, address, status, created_at, emergency_keys(code, name, color)),
          emergency_vehicles(vehicles(code, type))
        `)
        .eq('volunteer_id', volunteerId!)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const records = useQuery({
    queryKey: ['volunteer-records', volunteerId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('volunteer_records')
        .select('*')
        .eq('volunteer_id', volunteerId!)
        .order('record_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return { training, equipment, attendance, records };
}

/** Antigüedad legible a partir de la fecha de ingreso. */
export function seniority(joinDate?: string | null) {
  if (!joinDate) return null;
  const start = new Date(joinDate);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return '—';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? 'mes' : 'meses'}`;
  return `${years} ${years === 1 ? 'año' : 'años'}${rest ? ` ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''}`;
}
