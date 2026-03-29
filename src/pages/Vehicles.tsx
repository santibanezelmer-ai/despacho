import { vehicles, vehicleStatusConfig } from '@/data/mock-data';
import { Truck, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const filtered = vehicles.filter(v =>
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    v.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 text-info" />
          Móviles
        </h1>
        <Button size="sm" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo Móvil
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por código, tipo, compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(v => {
          const st = vehicleStatusConfig[v.status];
          return (
            <div key={v.id} className="console-panel p-4 hover:border-foreground/20 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <span className="text-lg font-mono font-bold text-foreground">{v.code}</span>
                <span className="status-badge" style={{ backgroundColor: `${st.color}20`, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{v.type}</p>
              <p className="text-xs text-muted-foreground">{v.company}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Cap. {v.capacity}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Users(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  );
}
