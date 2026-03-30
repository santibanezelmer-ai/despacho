import { Link } from 'react-router-dom';
import { Siren, Shield, Radio, MapPin, Users, Truck, BarChart3, Lock, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Siren, title: 'Despacho en Tiempo Real', desc: 'Consola de despacho con claves, tonos y asignación inmediata de móviles.' },
  { icon: Radio, title: 'Emergencias Activas', desc: 'Seguimiento en vivo del estado de cada emergencia con cronómetros.' },
  { icon: MapPin, title: 'Mapa Operativo', desc: 'Visualización georreferenciada de emergencias, grifos y recursos.' },
  { icon: Users, title: 'Gestión de Personal', desc: 'Control de voluntarios, rangos, compañías y disponibilidad.' },
  { icon: Truck, title: 'Flota de Móviles', desc: 'Administración completa de vehículos, equipamiento y mantención.' },
  { icon: BarChart3, title: 'Dashboard Analítico', desc: 'Métricas operativas, estadísticas y reportes por período.' },
];

const steps = [
  { n: '1', title: 'Solicita tu cuenta', desc: 'Registra tu cuerpo de bomberos con los datos de tu institución.' },
  { n: '2', title: 'Activación', desc: 'Nuestro equipo revisa y activa tu organización en el sistema.' },
  { n: '3', title: 'Opera', desc: 'Invita a tu equipo, configura tus claves y comienza a operar.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emergency">
              <Siren className="h-5 w-5 text-emergency-foreground" />
            </div>
            <span className="text-sm font-bold">Central de Bomberos</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs">Iniciar Sesión</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
                Registrar Organización
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center px-4 pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-emergency/5 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emergency/30 bg-emergency/10 px-4 py-1.5 text-xs font-medium text-emergency">
            <span className="h-1.5 w-1.5 rounded-full bg-emergency pulse-live" />
            Plataforma Multi-Organización
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Sistema de Despacho
            <span className="block text-emergency">para Cuerpos de Bomberos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Plataforma profesional de gestión operativa. Despacho en tiempo real, seguimiento de emergencias, gestión de recursos y análisis — todo aislado por organización.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2">
                Comenzar Ahora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-border">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold">Módulos del Sistema</h2>
        <p className="mb-12 text-center text-sm text-muted-foreground">Todo lo que necesitas para operar tu central de bomberos</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="console-panel p-5 hover:border-emergency/30 transition-colors">
              <f.icon className="mb-3 h-6 w-6 text-emergency" />
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="border-y border-border bg-card/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold">¿Cómo funciona?</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emergency/15 text-xl font-bold text-emergency">
                  {s.n}
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="mb-12 text-center text-2xl font-bold">Seguridad y Aislamiento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="console-panel p-5 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-success" />
            <h3 className="text-sm font-semibold">Aislamiento Total</h3>
            <p className="mt-2 text-xs text-muted-foreground">Cada organización opera con datos completamente separados a nivel de base de datos.</p>
          </div>
          <div className="console-panel p-5 text-center">
            <Shield className="mx-auto mb-3 h-8 w-8 text-info" />
            <h3 className="text-sm font-semibold">Roles por Organización</h3>
            <p className="mt-2 text-xs text-muted-foreground">Admin, Operador, Oficial y Visor — cada rol con permisos específicos.</p>
          </div>
          <div className="console-panel p-5 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-warning" />
            <h3 className="text-sm font-semibold">Multi-Cuartel</h3>
            <p className="mt-2 text-xs text-muted-foreground">Soporta múltiples cuerpos de bomberos operando de forma independiente.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Siren className="h-4 w-4 text-emergency" />
            Central de Bomberos v4.0
          </div>
          <p className="text-xs text-muted-foreground">Plataforma de despacho bomberil multi-organización</p>
        </div>
      </footer>
    </div>
  );
}
