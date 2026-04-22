import { XCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.45 } }),
};

const problems = [
  'Despachos lentos y manuales',
  'Información dispersa en múltiples canales',
  'Falta de control y trazabilidad de móviles',
];

const solutions = [
  'Activación de emergencias en segundos',
  'Información centralizada en una sola plataforma',
  'Control y seguimiento de recursos en tiempo real',
];

export default function ProblemSolutionSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-xl sm:text-3xl font-bold text-center mb-10 sm:mb-14"
      >
        ¿Por qué Operix?
      </motion.h2>

      <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
        {/* Problem */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="console-panel p-5 sm:p-7 border-destructive/15"
        >
          <h3 className="text-sm font-semibold text-destructive mb-4 uppercase tracking-wider">El problema</h3>
          <div className="space-y-3.5">
            {problems.map((p, i) => (
              <motion.div key={p} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{p}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Solution */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="console-panel p-5 sm:p-7 border-success/15"
        >
          <h3 className="text-sm font-semibold text-success mb-4 uppercase tracking-wider">La solución — Operix</h3>
          <div className="space-y-3.5">
            {solutions.map((s, i) => (
              <motion.div key={s} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{s}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
