import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="Operix" className="h-9 w-9 rounded-lg object-cover shadow-[0_0_12px_hsl(0_85%_55%/0.2)]" />
          <span className="hidden text-base font-bold tracking-tight min-[420px]:inline">Operix</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/activar">
            <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3">
              Soy voluntario
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs hover:bg-secondary/80 px-2 sm:px-3">
              Iniciar sesión
            </Button>
          </Link>
          <a href="#contacto">
            <Button
              size="sm"
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs font-semibold shadow-[0_0_15px_hsl(0_85%_55%/0.25)] hover:shadow-[0_0_25px_hsl(0_85%_55%/0.35)] transition-all"
            >
              <span className="sm:hidden">Reunión</span>
              <span className="hidden sm:inline">Solicitar reunión y prueba de 15 días</span>
            </Button>
          </a>
        </div>
      </div>
    </motion.header>
  );
}
