import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  emergencyId: string;
}

const ROLES = [
  { value: 'conductor', label: 'Conductor' },
  { value: 'oficial_a_cargo', label: 'Oficial a Cargo' },
  { value: 'voluntario', label: 'Voluntario' },
];

export default function VehiclePersonnelManager({ emergencyId }: Props) {
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: allVolunteers } = useVolunteers();

  // Fetch emergency vehicles with their personnel
  const { data: vehiclesWithPersonnel, isLoading } = useQuery({
    queryKey: ['emergency-vehicle-personnel', emergencyId],
    queryFn: async () => {
      const { data: evs, error: evErr } = await supabase
        .from('emergency_vehicles')
        .select('id, vehicle_id, volunteer_count, vehicles(code, type, companies(name))')
        .eq('emergency_id', emergencyId);
      if (evErr) throw evErr;

      const { data: personnel, error: epErr } = await supabase
        .from('emergency_personnel')
        .select('id, volunteer_id, emergency_vehicle_id, role, volunteers(name)')
        .eq('emergency_id', emergencyId);
      if (epErr) throw epErr;

      return (evs ?? []).map((ev: any) => ({
        ...ev,
        personnel: (personnel ?? []).filter((p: any) => p.emergency_vehicle_id === ev.id),
      }));
    },
    enabled: !!emergencyId,
  });

  const [adding, setAdding] = useState<Record<string, { volunteerId: string; role: string }>>({});

  const assignMutation = useMutation({
    mutationFn: async ({ evId, volunteerId, role }: { evId: string; volunteerId: string; role: string }) => {
      const { error } = await supabase.from('emergency_personnel').insert({
        emergency_id: emergencyId,
        emergency_vehicle_id: evId,
        volunteer_id: volunteerId,
        role,
        organization_id: orgId!,
      });
      if (error) throw error;
      return evId;
    },
    onSuccess: (evId) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicle-personnel', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      // Solo se cierra el formulario cuando la asignación quedó guardada
      setAdding(prev => { const next = { ...prev }; delete next[evId]; return next; });
      toast.success('Personal asignado');
    },
    onError: (err: Error) => toast.error(err.message || 'No se pudo asignar el personal'),
  });


  const removeMutation = useMutation({
    mutationFn: async (personnelId: string) => {
      const { error } = await supabase.from('emergency_personnel').delete().eq('id', personnelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicle-personnel', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      toast.success('Personal removido');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // 6-0 Voluntarios: cantidad (sin nombres) por móvil
  const countMutation = useMutation({
    mutationFn: async ({ evId, count }: { evId: string; count: number }) => {
      const { error } = await (supabase as any)
        .from('emergency_vehicles')
        .update({ volunteer_count: count })
        .eq('id', evId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-vehicle-personnel', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [counts, setCounts] = useState<Record<string, string>>({});

  // Get already assigned volunteer IDs
  const assignedVolunteerIds = new Set(
    (vehiclesWithPersonnel ?? []).flatMap((ev: any) => ev.personnel.map((p: any) => p.volunteer_id))
  );

  const availableVolunteers = (allVolunteers ?? []).filter(
    v => v.status === 'activo' && !assignedVolunteerIds.has(v.id)
  );

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <User className="h-3.5 w-3.5" /> Personal por Móvil
      </label>

      {(vehiclesWithPersonnel ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin móviles asignados</p>
      ) : (
        (vehiclesWithPersonnel ?? []).map((ev: any) => {
          const v = ev.vehicles;
          const addState = adding[ev.id];

          return (
            <div key={ev.id} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="truncate text-xs font-mono font-bold text-foreground">
                  {v?.code ?? '—'} · {v?.type ?? ''} {v?.companies?.name ? `(${v.companies.name})` : ''}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground">
                    6-0 Voluntarios
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    inputMode="numeric"
                    aria-label={`Cantidad de voluntarios en ${v?.code ?? 'móvil'}`}
                    value={counts[ev.id] ?? String(ev.volunteer_count ?? 0)}
                    onChange={e => setCounts(prev => ({ ...prev, [ev.id]: e.target.value }))}
                    onBlur={e => {
                      const n = Math.min(99, Math.max(0, parseInt(e.target.value || '0', 10) || 0));
                      setCounts(prev => ({ ...prev, [ev.id]: String(n) }));
                      if (n !== (ev.volunteer_count ?? 0)) countMutation.mutate({ evId: ev.id, count: n });
                    }}
                    className="h-7 w-12 rounded border border-border bg-muted/50 px-1.5 text-center text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Assigned personnel */}
              {ev.personnel.length > 0 && (
                <div className="space-y-1 mb-2">
                  {ev.personnel.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                      <span className="text-xs text-foreground">
                        {p.volunteers?.name ?? '—'}
                        <span className="ml-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                          {ROLES.find(r => r.value === p.role)?.label ?? p.role}
                        </span>
                      </span>
                      <button
                        onClick={() => removeMutation.mutate(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add personnel form */}
              {addState ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={addState.volunteerId}
                    onValueChange={val => setAdding(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], volunteerId: val } }))}
                  >
                    <SelectTrigger className="h-7 w-40 text-xs bg-muted/50">
                      <SelectValue placeholder="Voluntario..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVolunteers.map(vol => (
                        <SelectItem key={vol.id} value={vol.id} className="text-xs">{vol.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={addState.role}
                    onValueChange={val => setAdding(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], role: val } }))}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs bg-muted/50">
                      <SelectValue placeholder="Rol..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!addState.volunteerId || !addState.role || assignMutation.isPending}
                    onClick={() => {
                      assignMutation.mutate({ evId: ev.id, volunteerId: addState.volunteerId, role: addState.role });
                      setAdding(prev => { const next = { ...prev }; delete next[ev.id]; return next; });
                    }}
                  >
                    {assignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Asignar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setAdding(prev => { const next = { ...prev }; delete next[ev.id]; return next; })}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(prev => ({ ...prev, [ev.id]: { volunteerId: '', role: '' } }))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UserPlus className="h-3 w-3" /> Agregar personal
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
