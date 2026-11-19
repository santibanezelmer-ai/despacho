import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Siren, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Status = 'checking' | 'ready' | 'request' | 'done';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const err = hash.get('error_description') || query.get('error_description');
    const hasLink = hash.get('type') === 'recovery' || !!hash.get('access_token') || !!query.get('code');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (session && hasLink)) setStatus('ready');
    });

    const check = async () => {
      if (err) {
        setLinkError('El enlace venció o ya fue usado. Pide uno nuevo.');
        setStatus('request');
        return;
      }
      const code = query.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) { setLinkError('El enlace venció o ya fue usado. Pide uno nuevo.'); setStatus('request'); return; }
        }
        setStatus('ready');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) { setStatus('ready'); return; }
      if (!hasLink) { setStatus('request'); return; }
      // Link present but session still being processed: wait briefly, then fall back.
      setTimeout(async () => {
        if (!active) return;
        const { data: again } = await supabase.auth.getSession();
        if (!active) return;
        if (again.session) setStatus('ready');
        else { setLinkError('No pudimos validar el enlace. Pide uno nuevo.'); setStatus(s => (s === 'checking' ? 'request' : s)); }
      }, 6000);
    };
    void check();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setStatus('done');
    toast.success('Contraseña actualizada correctamente');
    setTimeout(() => navigate('/', { replace: true }), 2000);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke('request-password-reset', { body: { email, redirect_to: `${window.location.origin}/reset-password` } });
    setLoading(false);
    if (error) toast.error('No se pudo enviar. Intenta de nuevo.');
    else toast.success('Si el correo está registrado, te llegará un enlace nuevo.');
  };

  const shell = (children: React.ReactNode, title: string) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emergency" />
          <p className="text-sm text-muted-foreground">Verificando enlace de recuperación…</p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <p className="text-sm text-foreground font-medium">Contraseña actualizada. Redirigiendo…</p>
        </div>
      </div>
    );
  }

  if (status === 'request') {
    return shell(
      <form onSubmit={handleRequest} className="console-panel p-6 space-y-4">
        {linkError && <p className="text-sm text-destructive">{linkError}</p>}
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Tu correo</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" className="bg-muted/50" placeholder="voluntario@bomberos.cl" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar enlace de recuperación
        </Button>
      </form>,
      'Recuperar contraseña',
    );
  }

  const pwdInput = (value: string, set: (v: string) => void) => (
    <div className="relative">
      <Input type={showPwd ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={value} onChange={e => set(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-muted/50 pr-10" />
      <button type="button" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground">
        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return shell(
    <form onSubmit={handleSubmit} className="console-panel p-6 space-y-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Nueva contraseña</label>
        {pwdInput(password, setPassword)}
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Confirmar contraseña</label>
        {pwdInput(confirm, setConfirm)}
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar Contraseña
      </Button>
    </form>,
    'Nueva Contraseña',
  );
}
