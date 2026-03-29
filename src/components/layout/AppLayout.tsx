import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Siren, Radio, MapPin, Users, Truck, ClipboardList,
  BarChart3, Shield, Settings, Monitor, Wrench, GraduationCap,
  Bell, FileDown, Wifi, Play, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Consola de Despacho', icon: Siren, section: 'Operaciones' },
  { path: '/emergencias', label: 'Emergencias Activas', icon: Radio, section: 'Operaciones' },
  { path: '/mapa', label: 'Mapa Operativo', icon: MapPin, section: 'Operaciones' },
  { path: '/voluntarios', label: 'Voluntarios', icon: Users, section: 'Recursos' },
  { path: '/moviles', label: 'Móviles', icon: Truck, section: 'Recursos' },
  { path: '/equipamiento', label: 'Equipamiento', icon: Wrench, section: 'Recursos' },
  { path: '/capacitaciones', label: 'Capacitaciones', icon: GraduationCap, section: 'Recursos' },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3, section: 'Análisis' },
  { path: '/auditoria', label: 'Auditoría', icon: Shield, section: 'Análisis' },
  { path: '/exportaciones', label: 'Exportaciones', icon: FileDown, section: 'Análisis' },
  { path: '/pantalla-central', label: 'Pantalla Central', icon: Monitor, section: 'Sistema' },
  { path: '/simulacion', label: 'Simulación', icon: Play, section: 'Sistema' },
  { path: '/alertas', label: 'Alertas', icon: Bell, section: 'Sistema' },
  { path: '/admin', label: 'Administración', icon: Settings, section: 'Sistema' },
];

const sections = ['Operaciones', 'Recursos', 'Análisis', 'Sistema'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emergency">
            <Siren className="h-5 w-5 text-emergency-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-foreground">Central de Bomberos</h1>
              <p className="text-[10px] font-mono text-muted-foreground">v4.0</p>
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="pulse-live h-2 w-2 rounded-full bg-success" />
          {!collapsed && (
            <span className="text-[11px] font-mono text-success">EN LÍNEA</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section} className="mb-1">
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section}
                </p>
              )}
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-emergency/15 text-emergency font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emergency' : ''}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center border-t border-border py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
