import { useState } from 'react';
import { Mail, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function LeadCaptureSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Ingresa un correo válido');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert({ email: trimmed, source: 'landing' });
      if (error) throw error;
      setSent(true);
      toast.success('¡Solicitud enviada! Te contactaremos pronto.');
    } catch {
      toast.error('Error al enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 sm:px-6 -mt-6 sm:-mt-10 relative z-20">
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto max-w-xl rounded-2xl border border-emergency/25 bg-card/90 backdrop-blur-2xl p-7 sm:p-10 text-center shadow-[0_0_50px_hsl(0_85%_55%/0.1),0_8px_32px_hsl(0_0%_0%/0.3)] relative overflow-hidden"
      >
        {/* Subtle glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-emergency/8 blur-[80px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emergency/10 px-3 py-1 text-[10px] font-semibold text-emergency mb-4">
            <Sparkles className="h-3 w-3" /> Acceso anticipado
          </div>
          <h2 className="text-lg sm:text-2xl font-bold mb-2">Solicita acceso para tu organización</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6">Te contactamos en menos de 24 horas</p>

          {sent ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-semibold text-success">¡Solicitud recibida!</p>
              <p className="text-xs text-muted-foreground">Revisa tu correo pronto</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="correo@tubrigada.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 border-border/50 text-sm focus:border-emergency/40 focus:ring-emergency/20"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emergency text-emergency-foreground hover:bg-emergency/90 h-12 px-7 gap-2 font-bold shadow-[0_0_25px_hsl(0_85%_55%/0.35)] hover:shadow-[0_0_40px_hsl(0_85%_55%/0.45)] transition-all duration-300 text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Solicitar acceso <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </section>
  );
}
