import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: 'Reducimos el tiempo de despacho de minutos a segundos. La diferencia en la respuesta operativa es enorme.',
    author: 'Comandante',
    org: 'Cuerpo de Bomberos Voluntarios',
  },
  {
    quote: 'Ahora tenemos control total de nuestros móviles y voluntarios en tiempo real. Antes era imposible.',
    author: 'Oficial de Guardia',
    org: 'Central de Comunicaciones',
  },
  {
    quote: 'La plataforma se implementó rápido y el equipo la adoptó sin resistencia. Es intuitiva y profesional.',
    author: 'Director',
    org: 'Cuerpo de Bomberos Regional',
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-xl sm:text-3xl font-bold text-center mb-10 sm:mb-14"
      >
        Lo que dicen nuestros usuarios
      </motion.h2>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={stagger}
        className="grid gap-4 sm:grid-cols-3"
      >
        {testimonials.map((t) => (
          <motion.div
            key={t.author}
            variants={fadeUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="console-panel p-5 sm:p-6 backdrop-blur-sm hover:border-border/60 transition-all duration-300 flex flex-col"
          >
            <Quote className="h-5 w-5 text-emergency/40 mb-3" />
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed flex-1 italic">"{t.quote}"</p>
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-xs font-semibold text-foreground">{t.author}</p>
              <p className="text-[10px] text-muted-foreground">{t.org}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
