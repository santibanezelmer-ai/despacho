import { Link } from 'react-router-dom';
import { ArrowRight, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const rows = [
  { feature: 'Tiempo de despacho', manual: 'Minutos con llamadas', operix: 'Segundos con un clic' },
  { feature: 'Ubicación de móviles', manual: 'Sin visibilidad en terreno', operix: 'Mapa en tiempo real' },
  { feature: 'Registro de emergencias', manual: 'Bitácora en papel', operix: 'Digital, auditable y exportable' },
  { feature: 'Notificación al personal', manual: 'Llamadas individuales', operix: 'Push masivo instantáneo' },
  { feature: 'Reportes operativos', manual: 'Elaboración manual', operix: 'Generación automática' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const row = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function ComparisonSection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">¿Por qué dejar el método manual?</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Compara cómo opera tu central hoy versus lo que Operix puede hacer por ti.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="rounded-2xl border border-border/40 overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-3 bg-card/80 border-b border-border/30 px-4 sm:px-6 py-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aspecto</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Manual</span>
            <span className="text-xs font-semibold text-emergency uppercase tracking-wider text-center">Operix</span>
          </div>

          {rows.map((r, i) => (
            <motion.div
              key={r.feature}
              variants={row}
              className={`grid grid-cols-3 items-center px-4 sm:px-6 py-4 ${i < rows.length - 1 ? 'border-b border-border/20' : ''} hover:bg-card/40 transition-colors`}
            >
              <span className="text-sm font-medium">{r.feature}</span>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="hidden sm:inline">{r.manual}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="hidden sm:inline">{r.operix}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link to="/register">
            <Button
              size="lg"
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 font-bold shadow-[0_0_30px_hsl(0_85%_55%/0.35)] hover:shadow-[0_0_50px_hsl(0_85%_55%/0.45)] transition-all duration-300 hover:scale-[1.03]"
            >
              Comenzar con Operix <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
