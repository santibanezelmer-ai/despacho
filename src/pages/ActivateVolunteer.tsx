import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Siren, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  org: z.string().trim().min(1, 'Enlace incompleto: falta el código del Cuerpo').max(100),
  rut: z.string().trim().max(15).refine(v => v === '' || v.replace(/[^0-9kK]/g, '').length >= 7, 'RUT inválido'),
  email: z.string().trim().email('Correo inválido').max(255),
});

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('volunteer-activation', { body });
  if (data) return data as any;
  // Non-2xx responses still carry a JSON body.
  try { return await (error as any)?.context?.json(); } catch { return { status: 'error' }; }
}

export default function ActivateVolunteer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(() => params.get('org') ?? '');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const orgCode = org.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
    const parsed = schema.safeParse({ org: orgCode, rut, email });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!consent) { toast.error('Debes aceptar el tratamiento de tus datos personales'); return; }
    setBusy(true);
    const res = await call({ action: 'request', ...parsed.data, consent: true });
    setBusy(false);
    if (res?.status === 'sent') { setChallenge(res.challenge_id); return; }
    if (res?.status === 'rate_limited') setMsg('Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
    else setMsg('No se pudo verificar. Revisa los datos e intenta nuevamente.');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!/^\d{6}$/.test(code)) { toast.error('El código tiene 6 dígitos'); return; }
    setBusy(true);
    const res = await call({ action: 'verify', challenge_id: challenge, code });
    setBusy(false);
    if (res?.status === 'ok' && res.token) { navigate(`/invite/${res.token}`); return; }
    if (res?.status === 'already_active') setMsg('Este perfil ya está activado. Inicia sesión con tu correo.');
    else if (res?.status === 'invalid_code') setMsg(`Código incorrecto.${typeof res.remaining === 'number' ? ` Te quedan ${res.remaining} intentos.` : ''}`);
    else { setMsg('El código venció o se agotaron los intentos. Solicita uno nuevo.'); setChallenge(null); setCode(''); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Activa tu acceso a Operix Voluntario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {challenge ? 'Revisa tu correo e ingresa el código de 6 dígitos.' : 'Ingresa el correo registrado en tu compañía.'}
          </p>
        </div>

        {!challenge ? (
          <form onSubmit={request} className="console-panel p-6 space-y-4">
            <div>
              <label htmlFor="activation-org" className="mb-1 block text-xs text-muted-foreground">Código de tu Cuerpo</label>
              <Input id="activation-org" value={org} onChange={e => setOrg(e.target.value)} required maxLength={100}
                autoComplete="off" autoCapitalize="none" spellCheck={false} className="bg-muted/50" />
              <p className="mt-1 text-xs text-muted-foreground">Solicita este código o el enlace de activación a tu compañía.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">RUT (opcional)</label>
              <Input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" autoComplete="off" className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Correo electrónico</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.cl" autoComplete="email" className="bg-muted/50" />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} className="mt-0.5" />
              <span>
                Autorizo el tratamiento de mis datos personales (RUT, nombre, correo y teléfono) por mi Cuerpo de Bomberos,
                solo para fines operativos y de emergencia, conforme a la Ley 19.628 y la Ley 21.719. Puedo solicitar acceso,
                corrección o eliminación de mis datos a mi compañía.
              </span>
            </label>
            {msg && <p className="text-xs text-warning">{msg}</p>}
            <Button type="submit" disabled={busy || !org.trim() || !consent} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar código a mi correo'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              ¿Ya tienes cuenta? <Link to="/voluntario" className="text-emergency underline">Inicia sesión</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="console-panel p-6 space-y-4">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
              Si tus datos coinciden con la nómina, enviamos un código a tu correo. Vence en 10 minutos.
            </p>
            <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
              autoComplete="one-time-code" placeholder="000000" className="bg-muted/50 text-center text-2xl tracking-[0.5em]" />
            {msg && <p className="text-xs text-warning">{msg}</p>}
            <Button type="submit" disabled={busy || code.length !== 6} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar y continuar'}
            </Button>
            <button type="button" onClick={() => { setChallenge(null); setCode(''); setMsg(null); }} className="w-full text-center text-xs text-muted-foreground underline">
              Volver y solicitar otro código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
