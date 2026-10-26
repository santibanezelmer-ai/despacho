import { Shield } from 'lucide-react';
import escudoEntreLagos from '@/assets/escudo-entre-lagos.png.asset.json';
import escudoPrimera from '@/assets/escudo-primera-compania.png.asset.json';
import escudoSegunda from '@/assets/escudo-segunda-compania.png.asset.json';

interface Partner {
  name: string;
  subtitle?: string;
  /** Imported image or public URL. Leave empty to show the shield badge. */
  logo?: string;
}

// Instituciones que trabajan con Operix Dispatch. Agregar nuevas aquí.
const PARTNERS: Partner[] = [
  { name: 'Cuerpo de Bomberos Entre Lagos', subtitle: 'Puyehue', logo: escudoEntreLagos.url },
  { name: 'Primera Compañía', subtitle: 'Federico Schulze · Entre Lagos', logo: escudoPrimera.url },
  { name: 'Segunda Compañía', subtitle: 'Bomberos Entre Lagos', logo: escudoSegunda.url },
];

function PartnerItem({ p }: { p: Partner }) {
  return (
    <div className="flex shrink-0 items-center gap-4 px-8 sm:gap-5 sm:px-14">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emergency/25 bg-emergency/10 sm:h-24 sm:w-24">
        {p.logo ? (
          <img src={p.logo} alt={p.name} className="h-full w-full object-contain p-1" loading="lazy" />
        ) : (
          <Shield className="h-10 w-10 text-emergency sm:h-12 sm:w-12" aria-hidden />
        )}
      </div>
      <div className="text-left">
        <p className="whitespace-nowrap text-base font-semibold text-foreground sm:text-lg">{p.name}</p>
        {p.subtitle && (
          <p className="whitespace-nowrap text-sm text-muted-foreground">{p.subtitle}</p>
        )}
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          En operación activa
        </span>
      </div>
    </div>
  );
}

export default function PartnersCarousel() {
  // Repeat enough to fill wide screens, then duplicate for a seamless loop.
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / PARTNERS.length)) }, () => PARTNERS).flat();
  return (
    <section aria-label="Operix en operaciones reales" className="border-y border-border/50 bg-card/40 pt-10 pb-24 sm:pb-28">
      <div className="mb-8 px-4 text-center">
        <h2 className="text-xl font-bold sm:text-3xl">Operix en operaciones reales</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Cuerpo de Bomberos de Entre Lagos y sus compañías usan Operix Dispatch en su operación diaria.
        </p>
      </div>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-partners-marquee group-hover:[animation-play-state:paused]">
          {[...base, ...base].map((p, i) => (
            <PartnerItem key={i} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
