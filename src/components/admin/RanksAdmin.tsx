import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RanksAdmin() {
  const { orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('0');

  const { data: ranks, isLoading } = useQuery({
    queryKey: ['ranks', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ranks')
        .select('*')
        .eq('organization_id', orgId)
        .order('level');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ranks').insert({
        name: newName.trim(),
        level: parseInt(newLevel) || 0,
        organization_id: orgId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
      setNewName('');
      setNewLevel('0');
      toast.success('Rango agregado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ranks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
      toast.success('Rango eliminado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, level, is_authority }: { id: string; name: string; level: number; is_authority?: boolean }) => {
      const payload: any = { name, level };
      if (is_authority !== undefined) payload.is_authority = is_authority;
      const { error } = await (supabase as any).from('ranks').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success('Rango actualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-info" />
        <h2 className="text-sm font-bold text-foreground">Gestión de Rangos</h2>
      </div>

      {/* Add form */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Nombre del rango</label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ej: Capitán"
            className="bg-muted/50 h-8 text-sm"
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-muted-foreground mb-1 block">Nivel</label>
          <Input
            type="number"
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            className="bg-muted/50 h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          className="h-8"
          disabled={!newName.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : (ranks ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay rangos configurados</p>
      ) : (
        <div className="space-y-1">
          {(ranks ?? []).map((r: any) => (
            <RankRow key={r.id} rank={r} onDelete={deleteMutation.mutate} onUpdate={updateMutation.mutate} />
          ))}
        </div>
      )}
    </div>
  );
}

function RankRow({ rank, onDelete, onUpdate }: { rank: any; onDelete: (id: string) => void; onUpdate: (data: { id: string; name: string; level: number; is_authority?: boolean }) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rank.name);
  const [level, setLevel] = useState(String(rank.level));

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1.5">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-7 text-xs flex-1 bg-muted/50"
        />
        <Input
          type="number"
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="h-7 text-xs w-16 bg-muted/50"
        />
        <Button size="sm" className="h-7 text-xs" onClick={() => {
          onUpdate({ id: rank.id, name: name.trim(), level: parseInt(level) || 0 });
          setEditing(false);
        }}>
          Guardar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setName(rank.name); setLevel(String(rank.level)); setEditing(false); }}>
          ×
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded bg-muted/20 px-3 py-2 group">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground w-8">Nv.{rank.level}</span>
        <span className="text-sm text-foreground">{rank.name}</span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(`¿Eliminar rango "${rank.name}"?`)) onDelete(rank.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
