import { Siren, Truck, Smartphone, Tv, Building2, Check } from 'lucide-react';
import {
  OperativeMapMock,
  ResourcesMock,
  VolunteerAppMock,
  TvScreenMock,
  ReportsMock,
} from './mockups/ModuleMockups';
import { CTA_PRIMARY_HREF, CTA_PRIMARY_LABEL } from './landingCtas';

export const OPERIX_MODULES = [
  {
    icon: Siren,
    name: 'Operix Central',
    summary: 'La consola de despacho de la central de alarmas.',
    features: [
      'Despacho de emergencias con claves, tonos y asignación de carros',
      'Búsqueda de direcciones, rutas y kilómetros',
      'Mapa operativo con grifos, sectores y cuadrantes',
      'Enlace de ubicación para el solicitante',
    ],
    mock: OperativeMapMock,
  },
  {
    icon: Truck,
    name: 'Operix Móvil',
    summary: 'Las claves de cada carro, informadas desde el terreno.',
    features: [
      'Envío de claves 6-3 a 6-10 desde el carro',
      'Cada clave queda pendiente hasta que la central la acepta',
      'Kilometraje desde la salida hasta el regreso',
    ],
    mock: ResourcesMock,
  },
  {
    icon: Smartphone,
    name: 'Operix Voluntario',
    summary: 'La app de cada voluntario, en Android, iOS y navegador.',
    features: [
      'Alertas de despacho con tono',
      'Detalle de la emergencia con navegación y grifos cercanos',
      'Historial personal y guardias asignadas',
      'Hoja de vida con carrera ANB y años de servicio',
    ],
    mock: VolunteerAppMock,
  },
  {
    icon: Tv,
    name: 'Operix Pantalla Central',
    summary: 'La pantalla del cuartel, sin cuentas de usuario.',
    features: [
      'Vinculación del televisor con un PIN de 6 dígitos',
      'Emergencias activas, cronómetros y estado de los carros',
      'Mapa en pantalla completa',
    ],
    mock: TvScreenMock,
  },
  {
    icon: Building2,
    name: 'Operix Gestión',
    summary: 'La administración del Cuerpo y sus compañías.',
    features: [
      'Voluntarios, compañías, cargos y carrera ANB',
      'Planificación de guardias por compañía',
      'Carros, material e inventario',
      'Reportes, folios y registro de auditoría',
    ],
    mock: ReportsMock,
  },
] as const;

export default function ModulesSection() {
  return (
    <section id="modulos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold sm:text-4xl">Los 5 módulos de Operix</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Una sola plataforma para la central, los carros, los voluntarios, el cuartel y la administración.
        </p>
      </div>

      <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {OPERIX_MODULES.map((m, i) => (
          <li key={m.name} className="flex flex-col rounded-2xl border border-border/50 bg-card/60 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emergency/25 bg-emergency/10">
                <m.icon className="h-5 w-5 text-emergency" aria-hidden />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Módulo {i + 1}</p>
                <h3 className="text-lg font-bold leading-tight">{m.name}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{m.summary}</p>
            <ul className="mt-4 space-y-2">
              {m.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <figure className="mt-5 pt-1">
              <m.mock />
              <figcaption className="mt-2 text-[10px] text-muted-foreground">Representación ilustrativa</figcaption>
            </figure>
          </li>
        ))}
        <li className="flex flex-col items-center justify-center rounded-2xl border border-emergency/30 bg-emergency/5 p-6 text-center">
          <p className="text-lg font-bold">Conoce los 5 módulos en una reunión</p>
          <p className="mt-2 text-sm text-muted-foreground">Te mostramos la plataforma y coordinamos tu prueba institucional de 15 días.</p>
          <a href={CTA_PRIMARY_HREF} className="mt-5 inline-flex h-11 items-center rounded-md bg-emergency px-5 text-sm font-bold text-emergency-foreground hover:bg-emergency/90">
            {CTA_PRIMARY_LABEL}
          </a>
        </li>
      </ol>
    </section>
  );
}
