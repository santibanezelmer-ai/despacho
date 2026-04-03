import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['active-emergencies'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
  };
}

function useLog() {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return async (emergencyId: string, message: string) => {
    await supabase.from('emergency_log').insert({
      emergency_id: emergencyId,
      organization_id: orgId!,
      message,
      created_by: user?.id ?? null,
    });
  };
}

export function useUpdateAddress() {
  const invalidate = useInvalidate();
  const log = useLog();
  return useMutation({
    mutationFn: async ({ id, address }: { id: string; address: string }) => {
      const { error } = await supabase.from('emergencies').update({ address }).eq('id', id);
      if (error) throw error;
      await log(id, `Dirección actualizada: ${address}`);
    },
    onSuccess: () => { invalidate(); toast.success('Dirección actualizada'); },
    onError: () => toast.error('Error al actualizar dirección'),
  });
}

export function useUpdateLocation() {
  const invalidate = useInvalidate();
  const log = useLog();
  return useMutation({
    mutationFn: async ({ id, latitude, longitude }: { id: string; latitude: number; longitude: number }) => {
      const { error } = await supabase.from('emergencies').update({ latitude, longitude }).eq('id', id);
      if (error) throw error;
      await log(id, `Ubicación asignada: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    },
    onSuccess: () => { invalidate(); toast.success('Ubicación guardada'); },
    onError: () => toast.error('Error al guardar ubicación'),
  });
}

export function useAssignVehicles() {
  const invalidate = useInvalidate();
  const { orgId } = useOrganization();
  const log = useLog();
  return useMutation({
    mutationFn: async ({ emergencyId, vehicleIds }: { emergencyId: string; vehicleIds: string[] }) => {
      const inserts = vehicleIds.map(vid => ({
        emergency_id: emergencyId,
        vehicle_id: vid,
        organization_id: orgId!,
      }));
      const { error } = await supabase.from('emergency_vehicles').insert(inserts);
      if (error) throw error;
      await supabase.from('vehicles').update({ status: 'en_servicio' as const }).in('id', vehicleIds);
      await log(emergencyId, `Móviles asignados: ${vehicleIds.length}`);
    },
    onSuccess: () => { invalidate(); toast.success('Móviles asignados'); },
    onError: () => toast.error('Error al asignar móviles'),
  });
}

export function useToggleFlag() {
  const invalidate = useInvalidate();
  const log = useLog();
  return useMutation({
    mutationFn: async ({ id, field, value, label }: { id: string; field: string; value: boolean; label: string }) => {
      const update: Record<string, any> = { [field]: value };
      if (field === 'declared' && value) update.declared_at = new Date().toISOString();
      const { error } = await supabase.from('emergencies').update(update).eq('id', id);
      if (error) throw error;
      await log(id, `${label}: ${value ? 'activado' : 'desactivado'}`);
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error('Error al actualizar'),
  });
}
