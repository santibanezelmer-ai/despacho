import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import MobileBottomNav from './MobileBottomNav';
import { Shield } from 'lucide-react';
import { registerForPushNotifications, setupPushListeners, removePushListeners } from '@/services/pushService';

export default function MobileLayout({ children }: { children: ReactNode }) {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapRoute = location.pathname === '/mobile/map';

  // Push notifications setup
  useEffect(() => {
    registerForPushNotifications();
    setupPushListeners(navigate);
    return () => removePushListeners();
  }, [navigate]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md safe-area-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
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
