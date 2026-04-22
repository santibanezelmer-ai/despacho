import { Building2, Zap, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { n: '1', title: 'Solicita tu cuenta', desc: 'Registra tu cuerpo de bomberos con los datos de tu institución.', icon: Building2 },
  { n: '2', title: 'Activación', desc: 'Nuestro equipo revisa y activa tu organización en el sistema.', icon: Zap },
  { n: '3', title: 'Opera', desc: 'Invita a tu equipo, configura tus claves y comienza a operar.', icon: Radio },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.45 } }),
};

export default function StepsSection() {
  return (
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
          variants={stagger}
          className="grid gap-8 sm:gap-6 sm:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.div key={s.n} variants={fadeUp} custom={i} className="text-center relative">
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
  );
}
