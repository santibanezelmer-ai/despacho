import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const globalBenefits = [
  'Sin costo de instalación',
  'Implementación guiada',
  'Capacitación incluida',
];

const plans = [
  {
    name: 'Básico',
    description: 'Para cuerpos pequeños que necesitan lo esencial',
    features: ['Despacho de emergencias', 'Gestión de voluntarios', 'Acceso web', 'Soporte básico'],
    cta: 'Solicitar acceso',
    link: '/register',
    highlighted: false,
  },
  {
    name: 'Profesional',
    description: 'La opción más completa para operaciones reales',
    badge: 'Más utilizado',
    features: ['Todo lo del plan Básico', 'App móvil con notificaciones push', 'Mapa operativo con hidrantes', 'Control de flota y equipamiento', 'Reportes y exportaciones'],
    cta: 'Solicitar demo',
    link: '/register',
    highlighted: true,
  },
  {
    name: 'Institucional',
    description: 'Para grandes instituciones con múltiples cuarteles',
    features: ['Multi-cuartel', 'Personalización completa', 'Integraciones a medida', 'Soporte técnico según plan'],
    cta: 'Contactar',
    link: '/register',
    highlighted: false,
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function PricingSection() {
  return (
    <section className="relative border-y border-border/40 bg-gradient-to-b from-card/30 via-background to-card/30 px-4 sm:px-6 py-20 sm:py-28 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emergency/[0.04] blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-5xl relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">Planes adaptados a tu organización</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Operix se ajusta al tamaño y necesidades de cada cuerpo de bomberos
          </p>
        </motion.div>

        {/* Global benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-12 sm:mb-16"
        >
          {globalBenefits.map((b) => (
            <div key={b} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-success" />
              </div>
              {b}
            </div>
          ))}
        </motion.div>

        {/* Plan cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="grid gap-5 sm:grid-cols-3 items-start"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-all duration-300 backdrop-blur-sm ${
                plan.highlighted
                  ? 'border-emergency/40 bg-card/80 shadow-[0_0_40px_hsl(0_85%_55%/0.15),0_8px_32px_hsl(0_0%_0%/0.25)] sm:scale-[1.05] z-10'
                  : 'border-border/50 bg-card/50 hover:border-border/70 hover:shadow-[0_4px_16px_hsl(0_0%_0%/0.2)]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-emergency px-4 py-1.5 text-[11px] font-bold text-emergency-foreground shadow-[0_0_20px_hsl(0_85%_55%/0.4)]">
                  <Star className="h-3 w-3" /> {plan.badge}
                </div>
              )}

              <h3 className="text-lg sm:text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${plan.highlighted ? 'text-emergency' : 'text-emergency/60'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={plan.link} className="mt-7">
                <Button
                  className={`w-full gap-2 h-11 font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-emergency text-emergency-foreground hover:bg-emergency/90 shadow-[0_0_25px_hsl(0_85%_55%/0.35)] hover:shadow-[0_0_40px_hsl(0_85%_55%/0.45)]'
                      : 'bg-secondary text-foreground hover:bg-secondary/80 hover:border-emergency/20'
                  }`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-xs text-muted-foreground/60 max-w-md mx-auto"
        >
          Los valores se ajustan según el tamaño de la organización. Contáctanos para una propuesta personalizada.
        </motion.p>
      </div>
    </section>
  );
}
