import { Lock, Shield, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  { icon: Lock, title: 'Aislamiento Total', desc: 'Cada organización opera con datos completamente separados a nivel de base de datos.' },
  { icon: Shield, title: 'Roles por Organización', desc: 'Admin, Operador, Oficial y Visor — cada rol con permisos específicos y auditados.' },
  { icon: Building2, title: 'Multi-Cuartel', desc: 'Soporta múltiples cuerpos de bomberos operando de forma independiente y segura.' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SecuritySection() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-2xl sm:text-4xl font-bold">Seguridad y Aislamiento</h2>
        <p className="mt-3 text-sm text-muted-foreground">Datos protegidos con estándares de nivel empresarial</p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={stagger}
        className="grid gap-5 sm:grid-cols-3"
      >
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 sm:p-7 text-center group hover:border-emergency/20 hover:shadow-[0_0_20px_hsl(0_85%_55%/0.08)] transition-all duration-300"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 group-hover:bg-emergency/10 border border-border/50 group-hover:border-emergency/20 transition-all duration-300">
              <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-emergency transition-colors duration-300" />
            </div>
            <h3 className="text-sm font-bold">{item.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
