import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildDemoLead, validateDemoRequest, EMPTY_DEMO_REQUEST, PRIVACY_POLICY_PATH, type DemoRequest } from './demoRequest';

type TextField = Exclude<keyof DemoRequest, 'consent'>;

const FIELDS: { key: TextField; label: string; placeholder: string; type?: string; inputMode?: 'tel' | 'email'; optional?: boolean; autoComplete?: string; max: number }[] = [
  { key: 'name', label: 'Nombre completo', placeholder: 'Nombre y apellido', autoComplete: 'name', max: 100 },
  { key: 'position', label: 'Cargo institucional', placeholder: 'Ej.: Comandante, Secretario/a', autoComplete: 'organization-title', max: 100 },
  { key: 'department', label: 'Cuerpo de Bomberos', placeholder: 'Nombre de tu Cuerpo', autoComplete: 'organization', max: 120 },
  { key: 'company', label: 'Compañía', placeholder: 'Si aplica', optional: true, max: 100 },
  { key: 'location', label: 'Ciudad y región', placeholder: 'Ciudad, Región', max: 120 },
  { key: 'phone', label: 'Teléfono / WhatsApp', type: 'tel', inputMode: 'tel', placeholder: '+56 9 …', autoComplete: 'tel', max: 30 },
  { key: 'email', label: 'Correo electrónico', type: 'email', inputMode: 'email', placeholder: 'nombre@correo.cl', autoComplete: 'email', max: 255 },
];

export default function ContactFormSection() {
  const [form, setForm] = useState<DemoRequest>(EMPTY_DEMO_REQUEST);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: TextField, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateDemoRequest(form);
    if (problem) { toast.error(problem); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert(buildDemoLead(form));
      if (error) throw error;
      setSent(true);
      toast.success('Solicitud enviada. Te contactaremos para coordinar la reunión.');
    } catch {
      toast.error('No se pudo enviar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold sm:text-4xl">Solicita una reunión</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Solicita una reunión de coordinación y conoce nuestra prueba institucional gratuita de 15 días.
          </p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/70 p-6 shadow-[0_8px_32px_hsl(0_0%_0%/0.3)] sm:p-10">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <p className="text-lg font-bold text-success">¡Solicitud recibida!</p>
              <p className="text-sm text-muted-foreground">Te contactaremos para coordinar la reunión y tu prueba gratuita de 15 días.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={`demo-${f.key}`} className="text-xs">
                      {f.label} {f.optional && <span className="text-muted-foreground">(opcional)</span>}
                    </Label>
                    <Input
                      id={`demo-${f.key}`}
                      type={f.type ?? 'text'}
                      autoComplete={f.autoComplete}
                      inputMode={f.inputMode}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      maxLength={f.max}
                      required={!f.optional}
                      disabled={loading}
                      className="h-11 border-border/50 bg-secondary/50"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-message" className="text-xs">
                  Mensaje <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="demo-message"
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  maxLength={1000}
                  placeholder="Cuéntanos qué necesita tu Cuerpo (opcional)"
                  disabled={loading}
                  className="min-h-[96px] resize-none border-border/50 bg-secondary/50"
                />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                <Checkbox
                  id="demo-consent"
                  checked={form.consent}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, consent: v === true }))}
                  disabled={loading}
                  aria-required="true"
                  className="mt-0.5"
                />
                <Label htmlFor="demo-consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  Acepto el tratamiento de mis datos personales para que Operix me contacte por esta solicitud, según la{' '}
                  <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline">política de privacidad</a>.
                </Label>
              </div>
              <Button type="submit" size="lg" disabled={loading} className="h-12 w-full gap-2 bg-emergency font-bold text-emergency-foreground hover:bg-emergency/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Solicitar reunión y prueba de 15 días
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
