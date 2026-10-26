import { CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Solo funcionalidades existentes en la plataforma.
const features = [
  'Consola de despacho con claves y tono de despacho',
  'Emergencias activas con claves por móvil y bitácora',
  'Mapa operativo con grifos, cuarteles y capas territoriales',
  'Solicitud de ubicación por enlace al denunciante',
  'Pantalla central para cuartel',
  'Gestión de voluntarios, compañías y rangos',
  'Gestión de móviles, equipamiento y kilometraje',
  'App móvil con notificaciones de despacho',
  'Ficha PDF de la emergencia, historial y exportaciones',
  'Roles de acceso y registro de auditoría',
  'Implementación guiada y capacitación',
  'Soporte por tickets desde la plataforma',
];

export default function PricingSection() {
  return (
    <section
      id="planes"
      className="relative border-y border-border/40 bg-gradient-to-b from-card/30 via-background to-card/30 px-4 sm:px-6 py-20 sm:py-28 overflow-hidden scroll-mt-24"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emergency/[0.04] blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-3xl relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">Servicio y precios</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Un solo plan con todas las funcionalidades, cotizado según tu institución.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-emergency/40 bg-card/80 p-6 sm:p-10 shadow-[0_0_40px_hsl(0_85%_55%/0.15),0_8px_32px_hsl(0_0%_0%/0.25)] backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emergency/20 bg-emergency/10">
              <Building2 className="h-5 w-5 text-emergency" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Plan Global Institucional</h3>
              <p className="text-sm text-muted-foreground">Cotización personalizada</p>
            </div>
          </div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emergency" />
                {f}
              </li>
            ))}
          </ul>

          <a href="#contacto" className="mt-8 block">
            <Button className="w-full gap-2 h-12 font-semibold bg-emergency text-emergency-foreground hover:bg-emergency/90 shadow-[0_0_25px_hsl(0_85%_55%/0.35)]">
              Solicitar cotización <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
