import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const microBenefits = [
  'Activación rápida',
  'Sin instalación compleja',
  'Acceso desde cualquier dispositivo',
];

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[92vh] sm:min-h-[95vh] items-center justify-center px-4 sm:px-6 pt-20 overflow-hidden">
      {/* Abstract background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emergency/6 blur-[150px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-emergency/8 via-transparent to-transparent" />

        {/* Radar rings */}
        {[300, 500, 700].map((size, i) => (
          <motion.div
            key={size}
            className="absolute top-1/2 left-1/2 rounded-full border border-emergency/10"
            style={{ width: size, height: size, x: '-50%', y: '-50%' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.05, 0.15] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
          />
        ))}

        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Pulse dots (simulated incidents) */}
        {[
          { top: '18%', left: '12%', delay: 0, size: 6 },
          { top: '30%', right: '18%', delay: 1.2, size: 5 },
          { top: '65%', left: '22%', delay: 2.1, size: 4 },
          { top: '55%', right: '10%', delay: 0.6, size: 5 },
          { top: '75%', left: '65%', delay: 1.8, size: 3 },
          { top: '20%', left: '55%', delay: 3, size: 4 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-emergency/60"
            style={{ top: dot.top, left: dot.left, right: (dot as any).right, width: dot.size, height: dot.size }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: dot.delay }}
          />
        ))}

        {/* Connecting lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
          <line x1="12%" y1="18%" x2="55%" y2="20%" stroke="hsl(0 85% 55%)" strokeWidth="0.5" />
          <line x1="55%" y1="20%" x2="82%" y2="30%" stroke="hsl(0 85% 55%)" strokeWidth="0.5" />
          <line x1="22%" y1="65%" x2="65%" y2="75%" stroke="hsl(0 85% 55%)" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-emergency/25 bg-emergency/8 px-4 py-1.5 text-xs font-medium text-emergency"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emergency pulse-live" />
          Plataforma Multi-Organización
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.08] tracking-tight"
        >
          Sistema de Despacho
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="block text-emergency mt-1 sm:mt-2"
            style={{ textShadow: '0 0 80px hsl(0 85% 55% / 0.4)' }}
          >
            en Tiempo Real para Bomberos
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mx-auto mt-5 sm:mt-8 max-w-xl text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed px-2"
        >
          Rapidez en el despacho, control total de tus recursos y coordinación operativa profesional — todo en una plataforma centralizada.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link to="/register">
            <Button
              size="lg"
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 h-12 sm:h-14 font-semibold shadow-[0_0_30px_hsl(0_85%_55%/0.4)] hover:shadow-[0_0_50px_hsl(0_85%_55%/0.5)] transition-shadow duration-300"
            >
              Comenzar Ahora <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="border-border/60 hover:border-emergency/30 hover:bg-emergency/5 w-full sm:w-auto text-sm sm:text-base transition-colors h-12 sm:h-14">
              Ya tengo cuenta
            </Button>
          </Link>
        </motion.div>

        {/* Micro-benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {microBenefits.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              {b}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
