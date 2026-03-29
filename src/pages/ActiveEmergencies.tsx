import { activeEmergencies, statusConfig } from '@/data/mock-data';
import ActiveEmergencyCard from '@/components/dispatch/ActiveEmergencyCard';
import { Radio, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ActiveEmergencies() {
  const active = activeEmergencies.filter(e => e.status !== 'finalizada');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Radio className="h-5 w-5 text-warning" />
          Emergencias Activas
        </h1>
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="mr-1.5 h-3.5 w-3.5" /> Filtrar
        </Button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            className="status-badge transition-opacity hover:opacity-80"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {active.map(e => (
          <ActiveEmergencyCard key={e.id} emergency={e} />
        ))}
      </div>

      {active.length === 0 && (
        <div className="console-panel flex flex-col items-center justify-center py-16 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay emergencias activas</p>
        </div>
      )}
    </div>
  );
}
