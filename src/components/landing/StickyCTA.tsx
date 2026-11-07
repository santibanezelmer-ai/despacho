import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CTA_PRIMARY_HREF, CTA_PRIMARY_LABEL } from './landingCtas';

// Barra inferior móvil. Se oculta mientras el formulario está en pantalla
// para no tapar sus campos ni el botón de envío.
export default function StickyCTA() {
  const [scrolled, setScrolled] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    // El formulario se carga después; se busca en cada desplazamiento.
    const onScroll = () => {
      setScrolled(window.scrollY > 600);
      const r = document.getElementById('contacto')?.getBoundingClientRect();
      setFormVisible(!!r && r.top < window.innerHeight && r.bottom > 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  const visible = scrolled && !formVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/90 p-2.5 pr-20 backdrop-blur-xl transition-transform duration-300 sm:hidden ${visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
    >
      <a
        href={CTA_PRIMARY_HREF}
        tabIndex={visible ? 0 : -1}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emergency px-3 text-sm font-bold text-emergency-foreground"
      >
        {CTA_PRIMARY_LABEL} <ArrowRight className="h-4 w-4 shrink-0" />
      </a>
    </div>
  );
}
