import { ArrowRight, LayoutGrid, Zap, Shield, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DispatchMock } from './mockups/ModuleMockups';
import { CTA_PRIMARY_HREF, CTA_PRIMARY_LABEL, CTA_SECONDARY_HREF, CTA_SECONDARY_LABEL } from './landingCtas';

const microBenefits = [
  { icon: Zap, text: '15 días gratis previa reunión' },
  { icon: Shield, text: 'Sin instalación compleja' },
  { icon: Wifi, text: 'Web, Android e iOS' },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-24 sm:px-6 sm:pt-28 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emergency/10 blur-[160px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.15fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emergency/25 bg-emergency/10 px-4 py-1.5 text-xs font-semibold text-emergency">
            Operix Central · Despacho para Cuerpos de Bomberos
          </p>
          <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.1rem]">
            Despacho en tiempo real
            <span className="mt-1 block text-emergency">para instituciones bomberiles</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0 lg:text-lg">
            Operix Dispatch reúne la central de despacho, las claves de los carros, la app de voluntarios, la pantalla de cuartel y la gestión institucional en una sola plataforma.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a href={CTA_PRIMARY_HREF} className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full gap-2 bg-emergency px-7 text-base font-bold text-emergency-foreground shadow-[0_0_35px_hsl(0_85%_55%/0.35)] hover:bg-emergency/90 sm:w-auto">
                {CTA_PRIMARY_LABEL} <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <a href={CTA_SECONDARY_HREF} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full gap-2 border-border/60 px-7 hover:border-emergency/40 hover:bg-emergency/5 sm:w-auto">
                <LayoutGrid className="h-4 w-4" /> {CTA_SECONDARY_LABEL}
              </Button>
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
            {microBenefits.map((b) => (
              <li key={b.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <b.icon className="h-3.5 w-3.5 text-emergency" aria-hidden /> {b.text}
              </li>
            ))}
          </ul>
        </div>

        <figure className="mx-auto w-full max-w-lg lg:max-w-none">
          <div className="rounded-2xl border border-border/50 bg-card/80 p-3 shadow-[0_20px_60px_hsl(0_0%_0%/0.45)]">
            <DispatchMock />
          </div>
          <figcaption className="mt-3 text-center text-[11px] text-muted-foreground">
            Representación ilustrativa de Operix Central. No corresponde a datos operacionales reales.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
