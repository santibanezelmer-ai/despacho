import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Siren } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  org: z.string().trim().min(1, 'Enlace incompleto: falta el código del Cuerpo').max(100),
  rut: z.string().trim().min(7, 'RUT inválido').max(15),
  email: z.string().trim().email('Correo inválido').max(255),
});

export default function ActivateVolunteer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const org = params.get('org') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const parsed = schema.safeParse({ org, rut, email });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('claim_volunteer_activation', {
      _org_slug: parsed.data.org, _rut: parsed.data.rut, _email: parsed.data.email,
    });
    setBusy(false);
    if (error) { setMsg('No se pudo verificar. Intenta nuevamente.'); return; }
    if (data?.status === 'ok' && data.token) { navigate(`/invite/${data.token}`); return; }
    if (data?.status === 'already_active') setMsg('Este perfil ya está activado. Inicia sesión con tu correo.');
    else setMsg('No encontramos un voluntario con ese RUT y correo. Revisa los datos o consulta a tu Ayudante/Secretario.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Activa tu acceso a Operix Voluntario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa tu RUT y el correo registrado en tu compañía.</p>
        </div>
        <form onSubmit={submit} className="console-panel p-6 space-y-4">
          {!org && <p className="text-xs text-destructive">Este enlace está incompleto. Pide el enlace oficial a tu compañía.</p>}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">RUT</label>
            <Input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" inputMode="text" autoComplete="off" className="bg-muted/50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Correo electrónico</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.cl" autoComplete="email" className="bg-muted/50" />
          </div>
          {msg && <p className="text-xs text-warning">{msg}</p>}
          <Button type="submit" disabled={busy || !org} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/voluntario" className="text-emergency underline">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
