import { useVolunteers } from '@/hooks/useVolunteers';
import { Users, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VolunteerFormDialog from '@/components/volunteers/VolunteerFormDialog';

export default function Volunteers() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<any>(null);
  const { data: volunteers, isLoading } = useVolunteers();
  const { canWrite } = useAuth();
  const qc = useQueryClient();

  const filtered = (volunteers ?? []).filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.companies?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.ranks?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (v: any) => {
    if (!confirm(`¿Eliminar a "${v.name}"?`)) return;
    const { error } = await supabase.from('volunteers').delete().eq('id', v.id);
    if (error) toast.error(error.message);
    else { toast.success('Voluntario eliminado'); qc.invalidateQueries({ queryKey: ['volunteers'] }); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-warning" /> Voluntarios
        </h1>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditingVolunteer(null); setDialogOpen(true); }} className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Voluntario
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, compañía, rango..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="console-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">RUT</th>
              <th className="px-4 py-3 text-left font-medium">Rango</th>
              <th className="px-4 py-3 text-left font-medium">Compañía</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Disponible</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : (
              filtered.map(v => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.rut ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.ranks?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.companies?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${v.status === 'activo' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`h-2.5 w-2.5 rounded-full inline-block ${v.available ? 'bg-success' : 'bg-muted-foreground'}`} />
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingVolunteer(v); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(v)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VolunteerFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} volunteer={editingVolunteer} />
    </div>
  );
}
