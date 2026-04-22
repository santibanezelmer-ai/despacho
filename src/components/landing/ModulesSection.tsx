import { Siren, Radio, MapPin, Users, Truck, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Siren, title: 'Despacho en Tiempo Real', desc: 'Activa emergencias al instante con claves, tonos y asignación inmediata de móviles.' },
  { icon: Radio, title: 'Emergencias Activas', desc: 'Seguimiento en vivo con cronómetros, estados y trazabilidad completa.' },
  { icon: MapPin, title: 'Mapa Operativo', desc: 'Visualiza emergencias, grifos y recursos en un mapa georreferenciado.' },
  { icon: Users, title: 'Gestión de Personal', desc: 'Controla voluntarios, rangos, compañías y disponibilidad desde un solo lugar.' },
  { icon: Truck, title: 'Flota de Móviles', desc: 'Administra vehículos, equipamiento, odómetro y mantención.' },
  { icon: BarChart3, title: 'Dashboard Analítico', desc: 'Métricas operativas, reportes por período y exportación de datos.' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

export default function ModulesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="text-center mb-10 sm:mb-14"
      >
        <motion.h2 variants={fadeUp} custom={0} className="text-xl sm:text-3xl font-bold">
          Módulos del Sistema
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Todo lo que necesitas para operar tu central de bomberos de forma profesional
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
        className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            custom={i}
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
            className="group console-panel p-5 sm:p-6 hover:border-emergency/30 hover:shadow-[0_0_25px_hsl(0_85%_55%/0.1)] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emergency/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-3 sm:mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emergency/10 group-hover:bg-emergency/15 transition-colors">
                <motion.div whileHover={{ rotate: 8 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <f.icon className="h-5 w-5 text-emergency" />
                </motion.div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
