import { Siren, Radio, MapPin, Users, Truck, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Siren, title: 'Despacho Instantáneo', desc: 'Activa emergencias con un clic: claves, tonos y asignación automática de recursos.' },
  { icon: Radio, title: 'Seguimiento en Vivo', desc: 'Cronómetros, estados y bitácora completa de cada emergencia en tiempo real.' },
  { icon: MapPin, title: 'Mapa Operativo', desc: 'Emergencias activas, grifos e hidrantes geolocalizados en un mapa interactivo.' },
  { icon: Users, title: 'Gestión de Personal', desc: 'Voluntarios, rangos, compañías y disponibilidad — todo en un solo lugar.' },
  { icon: Truck, title: 'Control de Flota', desc: 'Vehículos, equipamiento, odómetro y mantención bajo control centralizado.' },
  { icon: BarChart3, title: 'Analítica Operativa', desc: 'Métricas de rendimiento, reportes exportables y auditoría completa.' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ModulesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="text-center mb-12 sm:mb-16"
      >
        <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold">
          Módulos del Sistema
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
          Todo lo que necesitas para operar tu central de bomberos de forma profesional
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.25, ease: 'easeOut' } }}
            className="group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 sm:p-7 hover:border-emergency/35 hover:shadow-[0_0_35px_hsl(0_85%_55%/0.12),0_8px_24px_hsl(0_0%_0%/0.2)] transition-all duration-300 overflow-hidden cursor-default"
          >
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emergency/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
            
            <div className="relative">
              <motion.div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emergency/10 group-hover:bg-emergency/20 border border-emergency/10 group-hover:border-emergency/25 transition-all duration-300"
                whileHover={{ rotate: 6, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350 }}
              >
                <f.icon className="h-5 w-5 text-emergency group-hover:drop-shadow-[0_0_8px_hsl(0_85%_55%/0.5)] transition-all duration-300" />
              </motion.div>
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
