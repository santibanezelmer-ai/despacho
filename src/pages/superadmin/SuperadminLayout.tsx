import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, BarChart3, Building2, FileText, LogOut, ChevronLeft, Siren, LifeBuoy } from 'lucide-react';

const navItems = [
  { path: '/superadmin', label: 'Dashboard', icon: BarChart3 },
  { path: '/superadmin/organizaciones', label: 'Organizaciones', icon: Building2 },
  { path: '/superadmin/solicitudes', label: 'Solicitudes', icon: FileText },
  { path: '/superadmin/soporte', label: 'Soporte', icon: LifeBuoy },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-foreground">Superadmin</h1>
            <p className="text-[10px] font-mono text-muted-foreground">Panel Global</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  isActive ? 'bg-info/15 text-info font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-info' : ''}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <div className="my-2 mx-3 border-t border-border" />
          <Link
            to="/"
            className="mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Siren className="h-4 w-4 shrink-0" />
            <span className="truncate">Ir al Sistema</span>
          </Link>
        </nav>

        <div className="border-t border-border px-3 py-2">
          <p className="truncate text-xs font-medium text-foreground">{user?.email}</p>
          <p className="text-[10px] text-info uppercase font-semibold">SUPERADMIN</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emergency transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
