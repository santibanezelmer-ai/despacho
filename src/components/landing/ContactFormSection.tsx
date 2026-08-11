import { useState } from 'react';
import { Send, Loader2, CheckCircle2, User, Mail, MapPin, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const stationSizes = [
  { value: '1-20', label: '1 – 20 voluntarios' },
  { value: '21-50', label: '21 – 50 voluntarios' },
  { value: '51-100', label: '51 – 100 voluntarios' },
  { value: '100+', label: 'Más de 100 voluntarios' },
];

export default function ContactFormSection() {
  const [form, setForm] = useState({ name: '', email: '', city: '', station_size: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const { name, email, city } = form;
    if (!name.trim() || name.trim().length < 2) { toast.error('Ingresa tu nombre'); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Ingresa un correo válido'); return false; }
    if (email.trim().length > 255) { toast.error('El correo es demasiado largo'); return false; }
    if (!city.trim()) { toast.error('Ingresa tu ciudad o comuna'); return false; }
    if (form.message.length > 1000) { toast.error('El mensaje es demasiado largo'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert({
        email: form.email.trim(),
        source: 'contact_form',
        name: form.name.trim(),
        city: form.city.trim(),
        station_size: form.station_size || null,
        message: form.message.trim() || null,
      } as any);
      if (error) throw error;
      setSent(true);
      toast.success('¡Mensaje enviado! Te contactaremos pronto.');
    } catch {
      toast.error('Error al enviar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-4xl font-bold">¿Tienes preguntas? Contáctanos</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Cuéntanos sobre tu organización y te enviaremos una propuesta personalizada.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 sm:p-10 shadow-[0_8px_32px_hsl(0_0%_0%/0.3)] relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emergency/8 blur-[80px] pointer-events-none" />

          {sent ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 flex flex-col items-center gap-3 relative"
            >
              <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <p className="text-lg font-bold text-success">¡Mensaje recibido!</p>
              <p className="text-sm text-muted-foreground">Te contactaremos en menos de 24 horas.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre completo"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-border/50 text-sm"
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="correo@tubrigada.cl"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-border/50 text-sm"
                    maxLength={255}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ciudad o comuna"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-border/50 text-sm"
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
                <Select value={form.station_size} onValueChange={(v) => update('station_size', v)}>
                  <SelectTrigger aria-label="Tamaño del cuartel" className="h-12 bg-secondary/50 border-border/50 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Tamaño del cuartel" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {stationSizes.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  placeholder="Mensaje (opcional)"
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  className="pl-10 min-h-[100px] bg-secondary/50 border-border/50 text-sm resize-none"
                  maxLength={1000}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90 h-12 gap-2 font-bold shadow-[0_0_25px_hsl(0_85%_55%/0.35)] hover:shadow-[0_0_40px_hsl(0_85%_55%/0.45)] transition-all duration-300 text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enviar mensaje <Send className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
