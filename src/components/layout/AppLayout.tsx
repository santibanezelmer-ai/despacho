import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { startAutoSync } from '@/services/syncManager';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import DemoBanner from '@/components/demo/DemoBanner';
import DemoExpiredOverlay from '@/components/demo/DemoExpiredOverlay';
import {
  Siren, Radio, MapPin, Users, Truck, ClipboardList,
  BarChart3, Shield, Settings, Monitor, Wrench, GraduationCap,
  Bell, FileDown, Play, ChevronLeft, ChevronRight, LogOut, Menu, X, User, Archive, WifiOff
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems = [
  { path: '/', label: 'Consola de Despacho', icon: Siren, section: 'Operaciones' },
  { path: '/emergencias', label: 'Emergencias Activas', icon: Radio, section: 'Operaciones' },
  { path: '/historial', label: 'Historial', icon: Archive, section: 'Operaciones' },
  { path: '/mapa', label: 'Mapa Operativo', icon: MapPin, section: 'Operaciones' },
  { path: '/voluntarios', label: 'Voluntarios', icon: Users, section: 'Recursos' },
  { path: '/moviles', label: 'Móviles', icon: Truck, section: 'Recursos' },
  { path: '/companias', label: 'Compañías', icon: ClipboardList, section: 'Recursos' },
  { path: '/equipamiento', label: 'Equipamiento', icon: Wrench, section: 'Recursos' },
  { path: '/capacitaciones', label: 'Capacitaciones', icon: GraduationCap, section: 'Recursos' },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3, section: 'Análisis' },
  { path: '/auditoria', label: 'Auditoría', icon: Shield, section: 'Análisis' },
  { path: '/exportaciones', label: 'Exportaciones', icon: FileDown, section: 'Análisis' },
  { path: '/pantalla-central', label: 'Pantalla Central', icon: Monitor, section: 'Sistema' },
  { path: '/simulacion', label: 'Simulación', icon: Play, section: 'Sistema' },
  { path: '/alertas', label: 'Alertas', icon: Bell, section: 'Sistema' },
  { path: '/claves', label: 'Claves Emergencia', icon: Siren, section: 'Sistema' },
  { path: '/notificaciones', label: 'Notificaciones', icon: Bell, section: 'Sistema' },
  { path: '/admin', label: 'Administración', icon: Settings, section: 'Sistema' },
  { path: '/admin/onboarding', label: 'Configuración inicial', icon: ClipboardList, section: 'Sistema' },
];

const sections = ['Operaciones', 'Recursos', 'Análisis', 'Sistema'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isSuperadmin } = useAuth();
  const { currentOrg, orgRole, memberships, setCurrentOrgId } = useOrganization();
  const { isOnline } = useOnlineStatus();

  useEffect(() => { startAutoSync(); }, []);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo + Org name */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <img
          src="/favicon.png"
          alt="Operix"
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground">
              {currentOrg?.organization?.name ?? 'Operix'}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground">Operix v4.0</p>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Org selector for multi-membership */}
      {memberships.length > 1 && (!collapsed || isMobile) && (
        <div className="border-b border-border px-3 py-2">
          <Select value={currentOrg?.organization_id ?? ''} onValueChange={setCurrentOrgId}>
            <SelectTrigger className="h-7 text-xs bg-muted/50">
              <SelectValue placeholder="Seleccionar org..." />
            </SelectTrigger>
            <SelectContent>
              {memberships.filter(m => m.organization?.status === 'active').map(m => (
                <SelectItem key={m.organization_id} value={m.organization_id} className="text-xs">
                  {m.organization?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Live indicator */}
      <div className={`flex items-center gap-2 border-b border-border px-3 py-2 ${!isOnline ? 'bg-destructive/5' : ''}`}>
        {isOnline ? (
          <span className="pulse-live h-2 w-2 rounded-full bg-success" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
        )}
        {(!collapsed || isMobile) && (
          <span className={`text-[11px] font-mono ${isOnline ? 'text-success' : 'text-destructive'}`}>
            {isOnline ? 'EN LÍNEA' : 'SIN CONEXIÓN'}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isSuperadmin && (!collapsed || isMobile) && (
          <div className="mb-1">
            <Link
              to="/superadmin"
              className="mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-info hover:bg-info/10 font-medium"
              onClick={() => isMobile && setMobileOpen(false)}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="truncate">Panel Superadmin</span>
            </Link>
          </div>
        )}

        {sections.map((section) => (
          <div key={section} className="mb-1">
            {(!collapsed || isMobile) && (
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section}
              </p>
            )}
            {navItems
              .filter((item) => item.section === section)
              .map((item) => {
                const isActive = location.pathname === item.path;

                if (item.path === '/pantalla-central') {
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        window.open('/pantalla-central', 'central-screen', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
                        if (isMobile) setMobileOpen(false);
                      }}
                      className="mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors w-full text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      title={collapsed && !isMobile ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`mx-1.5 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-emergency/20 to-emergency/5 text-emergency font-medium shadow-sm border border-emergency/20'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5'
                    }`}
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emergency' : ''}`} />
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-border px-3 py-2">
        {(!collapsed || isMobile) && user && (
          <div className="mb-1">
            <Link to="/perfil" onClick={() => isMobile && setMobileOpen(false)} className="flex items-center gap-1.5 hover:text-info transition-colors">
              <User className="h-3.5 w-3.5" />
              <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
            </Link>
            <p className="text-[10px] text-muted-foreground uppercase">
              {orgRole ?? 'sin rol'}
              {isSuperadmin && <span className="ml-1 text-info">· SA</span>}
            </p>
          </div>
        )}
        <div className="flex items-center gap-1">
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-1 flex items-center justify-center py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={signOut}
            className="flex items-center justify-center py-1.5 px-2 text-muted-foreground hover:text-emergency transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex flex-col w-72 h-full bg-sidebar border-r border-border">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex md:hidden items-center gap-3 border-b border-border px-3 py-2 bg-card">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <img src="/favicon.png" alt="Operix" className="h-7 w-7 rounded-md object-cover" />
          <span className="text-sm font-bold text-foreground truncate">
            {currentOrg?.organization?.name ?? 'Operix'}
          </span>
        </header>

        <OfflineIndicator />
        <DemoBanner />
        <main className="flex-1 overflow-y-auto flex flex-col">{children}</main>
        <DemoExpiredOverlay />
      </div>
    </div>
  );
}
