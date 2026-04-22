import { Lock, Shield, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  { icon: Lock, color: 'text-success', title: 'Aislamiento Total', desc: 'Cada organización opera con datos completamente separados a nivel de base de datos.' },
  { icon: Shield, color: 'text-info', title: 'Roles por Organización', desc: 'Admin, Operador, Oficial y Visor — cada rol con permisos específicos.' },
  { icon: Building2, color: 'text-warning', title: 'Multi-Cuartel', desc: 'Soporta múltiples cuerpos de bomberos operando de forma independiente.' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function SecuritySection() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10 sm:mb-14 text-center text-xl sm:text-3xl font-bold"
      >
        Seguridad y Aislamiento
      </motion.h2>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={stagger}
        className="grid gap-3 sm:gap-4 sm:grid-cols-3"
      >
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="console-panel p-5 sm:p-6 text-center group hover:border-border/60 transition-colors"
          >
            <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 group-hover:bg-secondary transition-colors">
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
