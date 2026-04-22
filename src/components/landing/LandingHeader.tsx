import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="Operix" className="h-9 w-9 rounded-lg object-cover console-glow" />
          <span className="text-sm font-bold tracking-tight">Operix</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex">Iniciar Sesión</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-emergency text-emergency-foreground hover:bg-emergency/90 text-xs">
              <span className="hidden sm:inline">Registrar Organización</span>
              <span className="sm:hidden">Registrar</span>
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
