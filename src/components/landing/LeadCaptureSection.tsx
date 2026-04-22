import { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
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
    <section className="px-4 sm:px-6 -mt-8 sm:-mt-12 relative z-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-xl rounded-2xl border border-emergency/20 bg-card/80 backdrop-blur-xl p-6 sm:p-8 text-center shadow-[0_0_40px_hsl(0_85%_55%/0.08)]"
      >
        <h2 className="text-lg sm:text-xl font-bold mb-1.5">Solicita acceso para tu organización</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-5">Te contactamos en menos de 24h</p>

        {sent ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-4 text-success text-sm font-medium"
          >
            ✔ ¡Recibido! Revisa tu correo pronto.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="correo@tubrigada.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11 bg-secondary/60 border-border/60"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90 h-11 px-6 gap-2 font-semibold shadow-[0_0_20px_hsl(0_85%_55%/0.3)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Solicitar acceso <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
