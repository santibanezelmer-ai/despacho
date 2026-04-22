import { Building2, Zap, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { n: '1', title: 'Solicita tu cuenta', desc: 'Registra tu cuerpo de bomberos con los datos de tu institución.', icon: Building2 },
  { n: '2', title: 'Activación rápida', desc: 'Nuestro equipo revisa y activa tu organización en el sistema.', icon: Zap },
  { n: '3', title: 'Comienza a operar', desc: 'Invita a tu equipo, configura tus claves y despacha emergencias.', icon: Radio },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } }),
};

export default function StepsSection() {
  return (
    <section className="border-y border-border/40 bg-gradient-to-b from-card/20 to-background px-4 sm:px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">¿Cómo funciona?</h2>
          <p className="mt-3 text-sm text-muted-foreground">Tres pasos para digitalizar tu central</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="grid gap-10 sm:gap-8 sm:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.div key={s.n} variants={fadeUp} custom={i} className="text-center relative">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-emergency/30 to-transparent" />
              )}
              <motion.div
                whileHover={{ scale: 1.08, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency/10 border border-emergency/20 shadow-[0_0_20px_hsl(0_85%_55%/0.1)]"
              >
                <s.icon className="h-6 w-6 text-emergency" />
              </motion.div>
              <span className="text-[10px] font-mono text-emergency/50 uppercase tracking-[0.2em]">Paso {s.n}</span>
              <h3 className="mt-1.5 text-sm font-bold">{s.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
