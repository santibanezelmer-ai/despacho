import { motion } from 'framer-motion';
import { Siren, Map as MapIcon, MapPin, Radio, Smartphone, Truck, Tv, BarChart3 } from 'lucide-react';
import {
  DispatchMock,
  OperativeMapMock,
  LocationShareMock,
  NotificationsMock,
  VolunteerAppMock,
  ResourcesMock,
  TvScreenMock,
  ReportsMock,
} from './mockups/ModuleMockups';

const modules = [
  { icon: Siren, title: 'Consola de Despacho', desc: 'Activa una emergencia con un clic: clave, dirección, móviles y personal asignado.', mock: DispatchMock, wide: true },
  { icon: MapIcon, title: 'Mapa Operativo', desc: 'Emergencias activas, grifos e hidrantes y cuarteles geolocalizados en tiempo real.', mock: OperativeMapMock, wide: true },
  { icon: MapPin, title: 'Localización del Afectado', desc: 'Envía un enlace al solicitante y sigue su GPS en vivo sobre el mapa.', mock: LocationShareMock },
  { icon: Radio, title: 'Notificaciones y Tonos', desc: 'Push masivo con tono de despacho obligatorio, incluso con el móvil bloqueado.', mock: NotificationsMock },
  { icon: Smartphone, title: 'App / PWA de Voluntarios', desc: 'Instalable en cualquier teléfono: alertas, mapa, historial y confirmación de asistencia.', mock: VolunteerAppMock },
  { icon: Truck, title: 'Gestión de Recursos', desc: 'Flota, estados, equipamiento, odómetro y personal por compañía.', mock: ResourcesMock },
  { icon: Tv, title: 'Pantalla de Cuartel', desc: 'Vista para TV con emergencias activas, cronómetros y estado de móviles.', mock: TvScreenMock },
  { icon: BarChart3, title: 'Reportes y Trazabilidad', desc: 'Folios automáticos, métricas de respuesta, exportaciones y auditoría completa.', mock: ReportsMock },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function ShowcaseSection() {
  return (
    <section className="relative border-y border-border/40 bg-gradient-to-b from-background via-card/20 to-background px-4 sm:px-6 py-20 sm:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(0 85% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 85% 55%) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-emergency/70">Producto real en operación</span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-bold max-w-2xl mx-auto">
            Todo el control de la emergencia, <span className="text-emergency">en un solo lugar.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Módulos que hoy están funcionando en cuerpos de bomberos: desde la llamada hasta el reporte final.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-6"
        >
          {modules.map((m) => (
            <motion.article
              key={m.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 sm:p-5 hover:border-emergency/35 hover:shadow-[0_0_35px_hsl(0_85%_55%/0.12),0_10px_28px_hsl(0_0%_0%/0.25)] transition-all duration-300 ${
                m.wide ? 'lg:col-span-3' : 'lg:col-span-2'
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emergency/10 border border-emergency/15 group-hover:bg-emergency/20 group-hover:border-emergency/30 transition-colors duration-300">
                  <m.icon className="h-4 w-4 text-emergency" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{m.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
              <div className="transition-transform duration-500 group-hover:scale-[1.015]">
                <m.mock />
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-14 text-center"
        >
          <p className="text-lg sm:text-2xl font-bold">
            De la llamada al despacho. <span className="text-emergency">De la ubicación a la respuesta.</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Operix Dispatch conecta toda la operación de emergencia en una sola plataforma.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
