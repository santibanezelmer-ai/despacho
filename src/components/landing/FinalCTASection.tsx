
import { ArrowRight, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function FinalCTASection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl rounded-3xl border border-emergency/30 bg-gradient-to-br from-emergency/15 via-card/80 to-card p-12 sm:p-16 text-center relative overflow-hidden shadow-[0_0_60px_hsl(0_85%_55%/0.12),0_8px_32px_hsl(0_0%_0%/0.3)]"
      >
        {/* Decorative glows */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emergency/15 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-emergency/10 blur-[80px] pointer-events-none" />

        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-emergency/15 border border-emergency/25 flex items-center justify-center"
          >
            <Siren className="h-7 w-7 text-emergency" />
          </motion.div>

          <h2 className="text-2xl sm:text-4xl font-bold">Lleva tu despacho al siguiente nivel</h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Agenda una demostración y descubre cómo Operix puede transformar la respuesta de tu institución — implementación guiada y capacitación incluida.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#demo" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="bg-emergency text-emergency-foreground hover:bg-emergency/90 gap-2.5 w-full sm:w-auto text-base sm:text-lg px-10 h-13 sm:h-15 font-bold shadow-[0_0_45px_hsl(0_85%_55%/0.45),0_4px_20px_hsl(0_85%_55%/0.25)] hover:shadow-[0_0_65px_hsl(0_85%_55%/0.55)] hover:scale-[1.03] transition-all duration-300"
              >
                Solicitar una demostración <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
