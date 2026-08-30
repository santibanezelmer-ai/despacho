import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export type VehicleDevice = {
  id: string;
  organization_id: string;
  vehicle_id: string | null;
  name: string;
  platform: string | null;
  status: 'active' | 'revoked';
  activated_at: string;
  last_seen_at: string | null;
  vehicle_changed_at: string | null;
  vehicles: { id: string; code: string; status: string } | null;
};

export type DeviceCode = {
  id: string;
  code: string;
  label: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

/** Código legible de activación (sin caracteres ambiguos). */
function randomCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

export function useVehicleDevices() {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['vehicle-devices', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_devices')
        .select('*, vehicles(id, code, status)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleDevice[];
    },
    enabled: !!orgId,
    refetchInterval: 15000,
  });
}

export function useVehicleDeviceCodes() {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['vehicle-device-codes', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_device_codes')
        .select('id, code, label, expires_at, used_at, created_at')
        .eq('organization_id', orgId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeviceCode[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useVehicleDeviceActions() {
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vehicle-devices', orgId] });
    qc.invalidateQueries({ queryKey: ['vehicle-device-codes', orgId] });
  };

  const generateCode = useMutation({
    mutationFn: async ({ label, hours }: { label?: string; hours: number }) => {
      const code = randomCode();
      const { data, error } = await (supabase as any)
        .from('vehicle_device_codes')
        .insert({
          organization_id: orgId,
          code,
          label: label?.trim() || null,
          created_by: user?.id,
          expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        })
        .select('id, code, label, expires_at, used_at, created_at')
        .single();
      if (error) throw error;
      return data as DeviceCode;
    },
    onSuccess: invalidate,
  });

  const revokeDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await (supabase as any)
        .from('vehicle_devices')
        .update({ status: 'revoked', revoked_at: new Date().toISOString(), vehicle_id: null })
        .eq('id', deviceId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancelCode = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await (supabase as any)
        .from('vehicle_device_codes')
        .delete()
        .eq('id', codeId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { generateCode, revokeDevice, cancelCode };
}
