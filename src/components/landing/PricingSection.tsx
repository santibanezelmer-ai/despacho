import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Star } from 'lucide-react';
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
    features: ['Despacho de emergencias', 'Gestión de voluntarios', 'Acceso web', 'Soporte básico'],
    cta: 'Solicitar acceso',
    link: '/register',
    highlighted: false,
  },
  {
    name: 'Profesional',
    badge: 'Más utilizado',
    features: ['Todo lo anterior', 'App móvil con notificaciones', 'Mapa operativo', 'Gestión de móviles', 'Reportes y exportaciones'],
    cta: 'Solicitar demo',
    link: '/register',
    highlighted: true,
  },
  {
    name: 'Institucional',
    features: ['Multi-cuartel', 'Personalización completa', 'Integraciones a medida', 'Soporte prioritario'],
    cta: 'Contactar',
    link: '/register',
    highlighted: false,
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function PricingSection() {
  return (
    <section className="border-y border-border/50 bg-card/20 px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <h2 className="text-xl sm:text-3xl font-bold">Planes adaptados a tu organización</h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Operix se ajusta al tamaño y necesidades de cada cuerpo de bomberos
          </p>
        </motion.div>

        {/* Global benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 sm:mb-14"
        >
          {globalBenefits.map((b) => (
            <div key={b} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
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
          className="grid gap-4 sm:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative console-panel p-5 sm:p-7 flex flex-col transition-all duration-300 ${
                plan.highlighted
                  ? 'border-emergency/30 shadow-[0_0_30px_hsl(0_85%_55%/0.12)] scale-[1.02] sm:scale-105'
                  : 'hover:border-border/60'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-emergency/90 px-3 py-1 text-[10px] font-semibold text-emergency-foreground">
                  <Star className="h-3 w-3" /> {plan.badge}
                </div>
              )}
              <h3 className="text-base sm:text-lg font-bold mb-4">{plan.name}</h3>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emergency shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={plan.link} className="mt-6">
                <Button
                  className={`w-full gap-2 ${
                    plan.highlighted
                      ? 'bg-emergency text-emergency-foreground hover:bg-emergency/90 shadow-[0_0_20px_hsl(0_85%_55%/0.3)]'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
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
          className="mt-8 text-center text-[10px] sm:text-xs text-muted-foreground/60 max-w-md mx-auto"
        >
          Los valores se ajustan según el tamaño de la organización. Contáctanos para una propuesta personalizada.
        </motion.p>
      </div>
    </section>
  );
}
