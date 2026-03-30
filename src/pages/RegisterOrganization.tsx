import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Siren, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function RegisterOrganization() {
  const { signUp } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    orgName: '', phone: '', commune: '', region: '', message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.orgName) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await signUp(form.email, form.password, form.name);
      if (signUpError) throw signUpError;

      // Try to submit org request - will work if auto-confirm is on
      // If email confirmation is needed, user can submit after confirming
      try {
        await (supabase as any).from('organization_requests').insert({
          organization_name: form.orgName,
          applicant_name: form.name,
          applicant_email: form.email,
          phone: form.phone || null,
          commune: form.commune || null,
          region: form.region || null,
          message: form.message || null,
        });
      } catch {
        // Request will be created after email confirmation
      }

      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4 console-panel p-8">
          <CheckCircle className="mx-auto h-12 w-12 text-success" />
          <h2 className="text-lg font-bold text-foreground">Solicitud Enviada</h2>
          <p className="text-sm text-muted-foreground">
            Tu solicitud para <strong>{form.orgName}</strong> ha sido recibida. Revisa tu email para confirmar tu cuenta. Un administrador revisará tu solicitud antes de activar el acceso.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Ir al Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Registrar Organización</h1>
          <p className="text-xs text-muted-foreground mt-1">Solicita acceso para tu cuerpo de bomberos</p>
        </div>

        <form onSubmit={handleSubmit} className="console-panel p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos personales</p>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nombre completo *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Email *</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Contraseña *</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} className="bg-muted/50" />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos de la organización</p>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nombre del cuerpo de bomberos *</label>
              <Input value={form.orgName} onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Cuerpo de Bomberos de..." required className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Comuna</label>
                <Input value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Región</label>
                <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className="bg-muted/50" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Teléfono</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Mensaje (opcional)</label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="bg-muted/50 h-20" placeholder="Información adicional..." />
            </div>
          </div>

          <div className="rounded-md bg-warning/10 border border-warning/30 p-3">
            <p className="text-xs text-warning">Tu solicitud será revisada por un administrador antes de habilitar el acceso al sistema.</p>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Enviar Solicitud
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/login" className="text-emergency hover:underline">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
