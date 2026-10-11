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
  { name: '1ª Compañía', subtitle: 'Federico Schulze · Entre Lagos', logo: escudoPrimera.url },
  { name: '2ª Compañía', subtitle: 'Bomberos Entre Lagos', logo: escudoSegunda.url },
];

function PartnerItem({ p }: { p: Partner }) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-6 sm:px-10">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-emergency/25 bg-emergency/10">
        {p.logo ? (
          <img src={p.logo} alt={p.name} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Shield className="h-7 w-7 text-emergency" aria-hidden />
        )}
      </div>
      <div className="text-left">
        <p className="whitespace-nowrap text-sm font-semibold text-foreground">{p.name}</p>
        {p.subtitle && <p className="whitespace-nowrap text-xs text-muted-foreground">{p.subtitle}</p>}
      </div>
    </div>
  );
}

export default function PartnersCarousel() {
  // Repeat enough to fill wide screens, then duplicate for a seamless loop.
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / PARTNERS.length)) }, () => PARTNERS).flat();
  return (
    <section aria-label="Instituciones que confían en Operix Dispatch" className="border-y border-border/50 bg-card/40 py-8">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Cuerpos de Bomberos y Compañías que confían en Operix Dispatch
      </p>
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
