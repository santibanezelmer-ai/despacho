import { volunteers } from '@/data/mock-data';
import { Users, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Volunteers() {
  const [search, setSearch] = useState('');
  const filtered = volunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.company.toLowerCase().includes(search.toLowerCase()) ||
    v.rank.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-warning" />
          Voluntarios
        </h1>
        <Button size="sm" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Voluntario
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, compañía, rango..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-muted/50"
        />
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
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.rut}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.rank}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.company}</td>
                <td className="px-4 py-3">
                  <span className={`status-badge ${v.status === 'activo' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`h-2.5 w-2.5 rounded-full inline-block ${v.available ? 'bg-success' : 'bg-muted-foreground'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
