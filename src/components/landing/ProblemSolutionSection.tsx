import { XCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } }),
};

const problems = [
  'Despachos lentos y dependientes de radio',
  'Información dispersa en múltiples canales',
  'Sin trazabilidad ni control de móviles',
];

const solutions = [
  'Activación de emergencias en segundos',
  'Todo centralizado en una sola plataforma',
  'Control y seguimiento en tiempo real',
];

export default function ProblemSolutionSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-2xl sm:text-4xl font-bold">¿Por qué Operix?</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">La diferencia entre reaccionar y gestionar profesionalmente</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-5 sm:gap-8">
        {/* Problem */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive/60 via-destructive/30 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-9 w-9 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
            </div>
            <h3 className="text-sm font-bold text-destructive uppercase tracking-wider">El problema</h3>
          </div>
          <div className="space-y-4">
            {problems.map((p, i) => (
              <motion.div key={p} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive/80 shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">{p}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Solution */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="rounded-2xl border border-success/20 bg-success/[0.03] p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/60 via-success/30 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-9 w-9 rounded-lg bg-success/15 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-success" />
            </div>
            <h3 className="text-sm font-bold text-success uppercase tracking-wider">La solución — Operix</h3>
          </div>
          <div className="space-y-4">
            {solutions.map((s, i) => (
              <motion.div key={s} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground leading-relaxed">{s}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
