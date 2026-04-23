import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Clock, TrendingUp, Shield, Radio } from 'lucide-react';

interface StatProps {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

function AnimatedStat({ icon: Icon, value, suffix, label, delay }: StatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, value, {
      duration: 1.8,
      delay,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [inView, value, delay, motionVal]);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-emergency/30 transition-colors"
    >
      <div className="h-11 w-11 rounded-xl bg-emergency/10 border border-emergency/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-emergency" />
      </div>
      <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        {suffix === '%' ? '' : suffix === 's' ? '' : '-'}
        {display}
        {suffix}
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground text-center">{label}</p>
    </motion.div>
  );
}

const stats: Omit<StatProps, 'delay'>[] = [
  { icon: Clock, value: 80, suffix: '%', label: 'Reducción en tiempo de despacho' },
  { icon: TrendingUp, value: 99, suffix: '.9%', label: 'Disponibilidad de plataforma' },
  { icon: Shield, value: 100, suffix: '%', label: 'Datos cifrados y aislados' },
  { icon: Radio, value: 15, suffix: 's', label: 'Tiempo promedio de activación' },
];

export default function StatsSection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">Resultados que importan</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Métricas reales de organizaciones que ya operan con Operix.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <AnimatedStat key={s.label} {...s} delay={i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}
