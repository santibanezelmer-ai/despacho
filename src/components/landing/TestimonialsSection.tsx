import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: 'Reducimos el tiempo de despacho de minutos a segundos. La diferencia en la respuesta operativa es enorme.',
    author: 'Comandante',
    org: 'Cuerpo de Bomberos Voluntarios',
  },
  {
    quote: 'Ahora tenemos control total de nuestros móviles y voluntarios en tiempo real. Antes era imposible coordinar así.',
    author: 'Oficial de Guardia',
    org: 'Central de Comunicaciones',
  },
  {
    quote: 'La plataforma se implementó rápido y el equipo la adoptó sin resistencia. Es intuitiva y profesional.',
    author: 'Director Operativo',
    org: 'Cuerpo de Bomberos Regional',
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-2xl sm:text-4xl font-bold">Lo que dicen nuestros usuarios</h2>
        <p className="mt-3 text-sm text-muted-foreground">Resultados reales en operaciones de emergencia</p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={stagger}
        className="grid gap-5 sm:grid-cols-3"
      >
        {testimonials.map((t) => (
          <motion.div
            key={t.author}
            variants={fadeUp}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 sm:p-7 hover:border-emergency/20 hover:shadow-[0_0_25px_hsl(0_85%_55%/0.08)] transition-all duration-300 flex flex-col"
          >
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-emergency/10">
              <Quote className="h-4 w-4 text-emergency/60" />
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed flex-1 italic">"{t.quote}"</p>
            <div className="mt-5 pt-4 border-t border-border/30 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {t.author[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t.author}</p>
                <p className="text-[10px] text-muted-foreground">{t.org}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
