import { Radio, MapPin, Truck, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const reasons = [
  {
    icon: Radio,
    title: 'Despacho en tiempo real',
    text: 'Activa claves, asigna móviles y notifica al personal en segundos, con tonos de despacho obligatorios en cada dispositivo.',
  },
  {
    icon: MapPin,
    title: 'GPS y mapas operativos',
    text: 'Ubica la emergencia, solicita la posición del afectado y visualiza unidades, grifos y cuarteles en un solo mapa.',
  },
  {
    icon: Truck,
    title: 'Gestión de unidades',
    text: 'Estado de cada móvil, equipamiento, odómetro y mantención, siempre al día y auditado.',
  },
  {
    icon: Users,
    title: 'Gestión de personal',
    text: 'Fichas de voluntarios, asignación por móvil, roles operativos y asistencia automática en cada emergencia.',
  },
  {
    icon: BarChart3,
    title: 'Analítica y trazabilidad',
    text: 'Reportes, folios, tiempos de respuesta y registro de auditoría completo de cada operación.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad y operación 24/7',
    text: 'Datos cifrados y aislados por organización, con respaldo en la nube y disponibilidad continua para tu central.',
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function WhyOperixSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-2xl sm:text-4xl font-bold">¿Por qué Operix?</h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Una plataforma diseñada para la realidad operativa bomberil: rápida, confiable y con control total de tu institución.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={stagger}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {reasons.map((r) => (
          <motion.div
            key={r.title}
            variants={fadeUp}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 sm:p-7 hover:border-emergency/25 hover:shadow-[0_0_25px_hsl(0_85%_55%/0.08)] transition-all duration-300"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emergency/10 border border-emergency/20">
              <r.icon className="h-5 w-5 text-emergency" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">{r.title}</h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{r.text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
