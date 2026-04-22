import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function FinalCTASection() {
  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl rounded-2xl border border-emergency/25 bg-gradient-to-br from-emergency/12 via-card to-card p-10 sm:p-14 text-center relative overflow-hidden shadow-[0_0_50px_hsl(0_85%_55%/0.1)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emergency/5 to-transparent" />
        <div className="relative">
          <h2 className="text-xl sm:text-3xl font-bold">Solicita acceso para tu central hoy</h2>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Únete a la plataforma de despacho bomberil más completa. Comienza a operar en minutos con soporte guiado.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2 w-full sm:w-auto text-base sm:text-lg px-8 h-12 sm:h-14 font-semibold shadow-[0_0_35px_hsl(0_85%_55%/0.4)] hover:shadow-[0_0_55px_hsl(0_85%_55%/0.5)] transition-shadow duration-300"
              >
                Solicitar Cuenta <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
