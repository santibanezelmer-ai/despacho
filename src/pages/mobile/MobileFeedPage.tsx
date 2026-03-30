import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Flame, CheckCircle2, LayoutList, Loader2 } from 'lucide-react';
import { useMobileEmergencies } from '@/hooks/useMobileEmergencies';
import EmergencyMobileCard from '@/components/mobile/EmergencyMobileCard';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'live' | 'finished';

export default function MobileFeedPage() {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') === 'finished' ? 'finished' : 'all';
  const [filter, setFilter] = useState<FilterTab>(initialFilter as FilterTab);
  const [search, setSearch] = useState('');

  const { data: emergencies, isLoading } = useMobileEmergencies(filter === 'all' ? 'all' : filter);

  const filtered = useMemo(() => {
    if (!emergencies) return [];
    if (!search.trim()) return emergencies;
    const q = search.toLowerCase();
    return emergencies.filter(
      (e: any) =>
        e.address?.toLowerCase().includes(q) ||
        e.folio?.toLowerCase().includes(q) ||
        e.emergency_keys?.code?.toLowerCase().includes(q) ||
        e.emergency_keys?.name?.toLowerCase().includes(q)
    );
  }, [emergencies, search]);

  const liveItems = filtered.filter((e: any) => e.status !== 'finalizada');
  const finishedItems = filtered.filter((e: any) => e.status === 'finalizada');

  const tabs: { key: FilterTab; label: string; icon: typeof Flame }[] = [
    { key: 'all', label: 'Todas', icon: LayoutList },
    { key: 'live', label: 'En vivo', icon: Flame },
    { key: 'finished', label: 'Cerradas', icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar dirección, clave, folio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl bg-secondary border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filter === tab.key
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-secondary text-muted-foreground border border-transparent active:bg-secondary/80'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              {filter === 'live' ? <Flame className="w-7 h-7 text-muted-foreground" /> : <CheckCircle2 className="w-7 h-7 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium text-foreground">
              {filter === 'live' ? 'Sin emergencias activas' : filter === 'finished' ? 'Sin emergencias cerradas' : 'Sin emergencias'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'live' ? 'Todo tranquilo por ahora' : 'Aún no hay registros'}
            </p>
          </div>
        ) : (
          <>
            {/* Live section */}
            {filter !== 'finished' && liveItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">En vivo · {liveItems.length}</span>
                </div>
                {liveItems.map((e: any) => (
                  <EmergencyMobileCard key={e.id} emergency={e} />
                ))}
              </div>
            )}

            {/* Finished section */}
            {filter !== 'live' && finishedItems.length > 0 && (
              <div className="space-y-2">
                {filter === 'all' && liveItems.length > 0 && (
                  <div className="flex items-center gap-2 py-1 mt-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recientes · {finishedItems.length}</span>
                  </div>
                )}
                {finishedItems.map((e: any) => (
                  <EmergencyMobileCard key={e.id} emergency={e} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
