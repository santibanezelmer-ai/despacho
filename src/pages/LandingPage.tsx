import { Link } from 'react-router-dom';
import { Siren, Shield, Radio, MapPin, Users, Truck, BarChart3, Lock, Building2, ArrowRight, Zap, Clock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const features = [
  { icon: Siren, title: 'Despacho en Tiempo Real', desc: 'Consola de despacho con claves, tonos y asignación inmediata de móviles.' },
  { icon: Radio, title: 'Emergencias Activas', desc: 'Seguimiento en vivo del estado de cada emergencia con cronómetros.' },
  { icon: MapPin, title: 'Mapa Operativo', desc: 'Visualización georreferenciada de emergencias, grifos y recursos.' },
  { icon: Users, title: 'Gestión de Personal', desc: 'Control de voluntarios, rangos, compañías y disponibilidad.' },
  { icon: Truck, title: 'Flota de Móviles', desc: 'Administración completa de vehículos, equipamiento y mantención.' },
  { icon: BarChart3, title: 'Dashboard Analítico', desc: 'Métricas operativas, estadísticas y reportes por período.' },
];

const steps = [
  { n: '1', title: 'Solicita tu cuenta', desc: 'Registra tu cuerpo de bomberos con los datos de tu institución.', icon: Building2 },
  { n: '2', title: 'Activación', desc: 'Nuestro equipo revisa y activa tu organización en el sistema.', icon: Zap },
  { n: '3', title: 'Opera', desc: 'Invita a tu equipo, configura tus claves y comienza a operar.', icon: Radio },
];

const stats = [
  { value: '< 30s', label: 'Tiempo de despacho', icon: Clock },
  { value: '24/7', label: 'Disponibilidad', icon: Bell },
  { value: '100%', label: 'Aislamiento de datos', icon: Lock },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emergency console-glow">
              <Siren className="h-5 w-5 text-emergency-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">Central de Bomberos</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex">Iniciar Sesión</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
                <span className="hidden sm:inline">Registrar Organización</span>
                <span className="sm:hidden">Registrar</span>
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] sm:min-h-[90vh] items-center justify-center px-4 sm:px-6 pt-20">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-emergency/8 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emergency/5 blur-[120px]" />
          <div className="absolute top-20 right-10 w-2 h-2 rounded-full bg-emergency/40 animate-pulse" />
          <div className="absolute top-40 left-[15%] w-1.5 h-1.5 rounded-full bg-warning/30 animate-pulse delay-700" />
          <div className="absolute bottom-32 right-[20%] w-1 h-1 rounded-full bg-info/40 animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-emergency/25 bg-emergency/8 px-4 py-1.5 text-xs font-medium text-emergency"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emergency pulse-live" />
            Plataforma Multi-Organización
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight"
          >
            Sistema de Despacho
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="block text-emergency mt-1 sm:mt-2"
              style={{ textShadow: '0 0 60px hsl(var(--emergency) / 0.3)' }}
            >
              para Cuerpos de Bomberos
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto mt-5 sm:mt-8 max-w-xl text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed px-2"
          >
            Plataforma profesional de gestión operativa. Despacho en tiempo real, seguimiento de emergencias, gestión de recursos y análisis — todo aislado por organización.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link to="/register">
              <Button size="lg" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 w-full sm:w-auto text-sm sm:text-base console-glow">
                Comenzar Ahora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-border/60 hover:border-emergency/30 hover:bg-emergency/5 w-full sm:w-auto text-sm sm:text-base transition-colors">
                Ya tengo cuenta
              </Button>
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-14 sm:mt-20 flex flex-wrap justify-center gap-6 sm:gap-12"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/80">
                  <s.icon className="h-4 w-4 text-emergency" />
                </div>
                <div className="text-left">
                  <p className="text-lg sm:text-xl font-bold font-mono tracking-tight">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="text-center mb-10 sm:mb-14"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-xl sm:text-3xl font-bold">
            Módulos del Sistema
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Todo lo que necesitas para operar tu central de bomberos de forma profesional
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group console-panel p-5 sm:p-6 hover:border-emergency/25 transition-colors relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emergency/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="mb-3 sm:mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emergency/10">
                  <f.icon className="h-5 w-5 text-emergency" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Steps */}
      <section className="border-y border-border/50 bg-card/30 px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="mb-10 sm:mb-14 text-center text-xl sm:text-3xl font-bold"
          >
            ¿Cómo funciona?
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer}
            className="grid gap-8 sm:gap-6 sm:grid-cols-3"
          >
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} custom={i} className="text-center relative">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emergency/10 border border-emergency/20">
                  <s.icon className="h-5 w-5 text-emergency" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Paso {s.n}</span>
                <h3 className="mt-1 text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mb-10 sm:mb-14 text-center text-xl sm:text-3xl font-bold"
        >
          Seguridad y Aislamiento
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="grid gap-3 sm:gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Lock, color: 'text-success', title: 'Aislamiento Total', desc: 'Cada organización opera con datos completamente separados a nivel de base de datos.' },
            { icon: Shield, color: 'text-info', title: 'Roles por Organización', desc: 'Admin, Operador, Oficial y Visor — cada rol con permisos específicos.' },
            { icon: Building2, color: 'text-warning', title: 'Multi-Cuartel', desc: 'Soporta múltiples cuerpos de bomberos operando de forma independiente.' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="console-panel p-5 sm:p-6 text-center group hover:border-border/60 transition-colors"
            >
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 group-hover:bg-secondary transition-colors">
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl rounded-2xl border border-emergency/20 bg-gradient-to-br from-emergency/10 via-card to-card p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emergency/5 to-transparent" />
          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold">¿Listo para modernizar tu central?</h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Únete a la plataforma de despacho bomberil más completa. Solicita tu cuenta y comienza a operar en minutos.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 w-full sm:w-auto console-glow">
                  Solicitar Cuenta <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 sm:px-6 py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Siren className="h-4 w-4 text-emergency" />
            Central de Bomberos v4.0
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60">Plataforma de despacho bomberil multi-organización</p>
        </div>
      </footer>
    </div>
  );
}
