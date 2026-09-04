import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, Shield, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const microBenefits = [
  { icon: Zap, text: 'Activación rápida' },
  { icon: Shield, text: 'Sin instalación compleja' },
  { icon: Wifi, text: 'Acceso desde cualquier dispositivo' },
];

// Pulse dots simulating incidents on a virtual map
const pulseDots = [
  { top: '15%', left: '8%', delay: 0, size: 7 },
  { top: '25%', right: '14%', delay: 1.4, size: 6 },
  { top: '60%', left: '18%', delay: 2.2, size: 5 },
  { top: '50%', right: '8%', delay: 0.7, size: 6 },
  { top: '78%', left: '60%', delay: 1.9, size: 4 },
  { top: '22%', left: '48%', delay: 3.2, size: 5 },
  { top: '70%', right: '25%', delay: 0.3, size: 4 },
  { top: '40%', left: '5%', delay: 2.7, size: 3 },
];

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[94vh] sm:min-h-[96vh] items-center justify-center px-4 sm:px-6 pt-20 pb-8 overflow-hidden">
      {/* ===== Abstract background ===== */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Primary radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-emergency/8 blur-[180px]" />
        <div className="absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b from-emergency/10 via-emergency/3 to-transparent" />

        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden>
          <defs>
            <pattern id="hero-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>

        {/* Radar rings */}
        {[280, 480, 680, 880].map((size, i) => (
          <motion.div
            key={size}
            className="absolute top-1/2 left-1/2 rounded-full border border-emergency/[0.08]"
            style={{ width: size, height: size, x: '-50%', y: '-50%' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.18, 0.02, 0.18] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 1 }}
          />
        ))}

        {/* Pulse dots */}
        {pulseDots.map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-emergency/70"
            style={{ top: dot.top, left: dot.left, right: (dot as any).right, width: dot.size, height: dot.size }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0.1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, delay: dot.delay, ease: 'easeInOut' }}
          >
            {/* Ring around dot */}
            <motion.div
              className="absolute inset-0 rounded-full border border-emergency/30"
              animate={{ scale: [1, 3.5], opacity: [0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: dot.delay + 0.3 }}
            />
          </motion.div>
        ))}

        {/* Connecting network lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
          <line x1="8%" y1="15%" x2="48%" y2="22%" stroke="hsl(0 85% 55%)" strokeWidth="0.6" strokeDasharray="4 6" />
          <line x1="48%" y1="22%" x2="86%" y2="25%" stroke="hsl(0 85% 55%)" strokeWidth="0.5" strokeDasharray="4 6" />
          <line x1="18%" y1="60%" x2="60%" y2="78%" stroke="hsl(0 85% 55%)" strokeWidth="0.5" strokeDasharray="4 6" />
          <line x1="8%" y1="15%" x2="18%" y2="60%" stroke="hsl(0 85% 55%)" strokeWidth="0.4" strokeDasharray="3 8" />
          <line x1="86%" y1="25%" x2="92%" y2="50%" stroke="hsl(0 85% 55%)" strokeWidth="0.4" strokeDasharray="3 8" />
          <line x1="60%" y1="78%" x2="75%" y2="70%" stroke="hsl(0 85% 55%)" strokeWidth="0.4" strokeDasharray="3 8" />
        </svg>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* ===== Content ===== */}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-emergency/25 bg-emergency/8 px-5 py-2 text-xs font-semibold text-emergency shadow-[0_0_20px_hsl(0_85%_55%/0.15)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emergency" />
          </span>
          Plataforma Operativa en Línea
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.06] tracking-tight"
        >
          Despacho en tiempo real{' '}
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
            className="block text-emergency mt-1 sm:mt-3"
            style={{ textShadow: '0 0 100px hsl(0 85% 55% / 0.5), 0 0 40px hsl(0 85% 55% / 0.25)' }}
          >
            para instituciones bomberiles
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-6 sm:mt-8 max-w-2xl text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed px-2"
        >
          Operix Dispatch centraliza el despacho de emergencias, la ubicación GPS, la gestión de unidades y personal, y la analítica operativa — para que tu institución responda más rápido y con control total.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-8 sm:mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <a href="#demo" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2.5 w-full sm:w-auto text-base sm:text-lg px-10 sm:px-12 h-12 sm:h-14 font-bold shadow-[0_0_40px_hsl(0_85%_55%/0.45),0_4px_20px_hsl(0_85%_55%/0.25)] hover:shadow-[0_0_60px_hsl(0_85%_55%/0.55),0_6px_30px_hsl(0_85%_55%/0.35)] transition-all duration-300 hover:scale-[1.03]"
            >
              Solicitar una demo <ArrowRight className="h-5 w-5" />
            </Button>
          </a>
          <Link to="/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="border-border/60 hover:border-emergency/40 hover:bg-emergency/5 w-full sm:w-auto text-sm sm:text-base transition-all h-12 sm:h-14 px-8"
            >
              Ya tengo cuenta
            </Button>
          </Link>
        </motion.div>

        {/* Micro-benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3"
        >
          {microBenefits.map((b, i) => (
            <motion.div
              key={b.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.15 }}
              className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-3 w-3 text-success" />
              </div>
              {b.text}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
