import escudoEntreLagos from '@/assets/escudo-entre-lagos.png.asset.json';
import escudoPrimera from '@/assets/escudo-primera-compania.png.asset.json';
import escudoSegunda from '@/assets/escudo-segunda-compania.png.asset.json';

interface Partner {
  name: string;
  subtitle: string;
  logo: string;
}

// Instituciones que usan Operix Dispatch, con sus escudos oficiales autorizados.
const PARTNERS: Partner[] = [
  { name: 'Cuerpo de Bomberos de Entre Lagos', subtitle: 'Puyehue, Región de Los Lagos', logo: escudoEntreLagos.url },
  { name: 'Primera Compañía', subtitle: 'Federico Schulze · Entre Lagos', logo: escudoPrimera.url },
  { name: 'Segunda Compañía', subtitle: 'Bomberos Entre Lagos', logo: escudoSegunda.url },
];

export default function PartnersCarousel() {
  return (
    <section id="entre-lagos" aria-labelledby="entre-lagos-title" className="scroll-mt-24 border-y border-border/50 bg-card/40 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-5xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-emergency">Institución usuaria</p>
        <h2 id="entre-lagos-title" className="mt-2 text-xl font-bold sm:text-3xl">Operix en el Cuerpo de Bomberos de Entre Lagos</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          El Cuerpo de Bomberos de Entre Lagos y sus compañías usan Operix Dispatch en su operación diaria.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {PARTNERS.map((p) => (
            <li key={p.name} className="flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-6">
              <img src={p.logo} alt={`Escudo de ${p.name}`} width={112} height={112} loading="lazy" className="h-28 w-28 object-contain" />
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.subtitle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
