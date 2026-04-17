import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import MobileBottomNav from './MobileBottomNav';
import { Shield } from 'lucide-react';

export default function MobileLayout({ children }: { children: ReactNode }) {
  const { currentOrg } = useOrganization();
  const location = useLocation();
  const isMapRoute = location.pathname === '/mobile/map';

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md safe-area-top">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="Operix" className="w-8 h-8 rounded-lg object-cover" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground leading-none">Operix Dispatch</span>
            {currentOrg?.organization?.name && (
              <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-[200px]">
                {currentOrg.organization.name}
              </span>
            )}
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" title="Conectado" />
      </header>

      {/* Content — no scroll for map route so Leaflet gets full height */}
      <main
        className={`flex-1 ${isMapRoute ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}
        style={{ minHeight: 0 }}
      >
        {children}
      </main>

      {/* Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}
