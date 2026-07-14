import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Clock, User, Siren, Map as MapIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function VoluntarioLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const hideNav = loc.pathname === '/voluntario/login';

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>Operix Voluntario</title>
        <link rel="manifest" href="/manifest-voluntario.webmanifest" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="apple-touch-icon" href="/voluntario-icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Voluntario" />
      </Helmet>

      <main className={`flex-1 ${hideNav ? '' : 'pb-20'}`}>{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom">
          <div className="mx-auto max-w-md grid grid-cols-3">
            <Tab to="/voluntario" icon={<Siren className="h-6 w-6" />} label="Activas" exact />
            <Tab to="/voluntario/historial" icon={<Clock className="h-6 w-6" />} label="Historial" />
            <Tab to="/voluntario/perfil" icon={<User className="h-6 w-6" />} label="Perfil" />
          </div>
        </nav>
      )}
    </div>
  );
}

function Tab({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium min-h-16 ${
          isActive ? 'text-emergency' : 'text-muted-foreground'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
