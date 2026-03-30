import { useLocation, useNavigate } from 'react-router-dom';
import { Flame, Clock, Map, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/mobile/feed', icon: Flame, label: 'En vivo' },
  { path: '/mobile/feed?filter=finished', icon: Clock, label: 'Historial' },
  { path: '/mobile/map', icon: Map, label: 'Mapa' },
  { path: '/mobile/profile', icon: User, label: 'Perfil' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="flex-shrink-0 border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            (tab.path === '/mobile/feed' && location.pathname === '/mobile/feed' && !location.search.includes('filter=finished')) ||
            (tab.path === '/mobile/feed?filter=finished' && location.search.includes('filter=finished')) ||
            (tab.path === '/mobile/map' && location.pathname === '/mobile/map') ||
            (tab.path === '/mobile/profile' && location.pathname === '/mobile/profile');

          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
