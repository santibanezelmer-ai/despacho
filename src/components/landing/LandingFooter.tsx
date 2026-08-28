import { Mail, AlertTriangle } from 'lucide-react';

const contactLinks = [
  { email: 'contacto@operixdispatch.com', label: 'Contacto general' },
  { email: 'ventas@operixdispatch.com', label: 'Ventas' },
  { email: 'soporte@operixdispatch.com', label: 'Soporte' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/30 px-4 sm:px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Main contact grid */}
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-12">
          {/* Contact group */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground mb-4">
              Contacto
            </h3>
            <ul className="space-y-3">
              {contactLinks.map(({ email, label }) => (
                <li key={email}>
                  <a
                    href={`mailto:${email}`}
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emergency transition-colors"
                    aria-label={`Enviar correo a ${label}: ${email}`}
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emergency transition-colors" />
                    <span>{label}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground/60 group-hover:text-emergency/80 transition-colors">
                      {email}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Complaints channel - visually separated */}
          <div className="md:border-l md:border-border/30 md:pl-12">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-emergency" />
              Canal de denuncias
            </h3>
            <a
              href="mailto:denuncias@operixdispatch.com"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emergency transition-colors"
              aria-label="Enviar correo al canal de denuncias: denuncias@operixdispatch.com"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emergency transition-colors" />
              <span>denuncias@operixdispatch.com</span>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <img src="/favicon.png" alt="Operix" className="h-5 w-5 rounded" />
            <span className="font-semibold text-foreground">Operix</span>
            <span className="text-xs">v4.0</span>
          </div>
          <p className="text-xs text-muted-foreground/50">
            Plataforma de despacho en tiempo real para cuerpos de bomberos
          </p>
        </div>
      </div>
    </footer>
  );
}
