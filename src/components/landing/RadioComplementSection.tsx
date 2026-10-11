import { Radio, MapPin, ListChecks, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

const points = [
  { icon: MapPin, text: 'Ubicación de la emergencia, grifos y cuarteles en el mapa.' },
  { icon: ListChecks, text: 'Claves por móvil y bitácora con hora de cada evento.' },
  { icon: Monitor, text: 'Pantalla de cuartel con las emergencias activas.' },
];

export default function RadioComplementSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-emergency/25 bg-card/60 p-6 sm:p-10 backdrop-blur-sm"
      >
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emergency/60 via-emergency/30 to-transparent" />
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emergency/20 bg-emergency/10">
            <Radio className="h-6 w-6 text-emergency" />
          </div>
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Un complemento para tu sistema radial VHF/UHF</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed sm:text-base">
              Operix apoya el despacho y la coordinación visual de la central, sin reemplazar las comunicaciones
              radiales. La voz y el mando en terreno siguen por radio; Operix agrega el registro y la vista compartida.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {points.map((p) => (
                <li key={p.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-emergency" />
                  {p.text}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground/70">
              Operix no se conecta directamente a equipos de radio.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
