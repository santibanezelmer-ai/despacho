import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Siren, CheckCircle2, AlertTriangle, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Visor',
  voluntario: 'Voluntario (PWA)',
};

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const autoAcceptedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_invitation_preview', { _token: token });
      if (error || !data) {
        setError('Invitación no encontrada o inválida');
      } else {
        setPreview(data);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { data, error } = await (supabase as any).rpc('accept_invitation', { _token: token });
    if (error) {
      toast.error(error.message);
      setAccepting(false);
      return;
    }
    toast.success('¡Bienvenido a la organización!');
    const role = data?.role;
    setTimeout(() => navigate(role === 'voluntario' ? '/voluntario' : '/'), 600);
  };

  // Auto-accept when an authenticated session matches the invitation email
  useEffect(() => {
    if (autoAcceptedRef.current) return;
    if (!user || !preview || !token) return;
    if (preview.status !== 'pending') return;
    if (new Date(preview.expires_at) < new Date()) return;
    const userEmail = (user.email || '').toLowerCase();
    if (userEmail && userEmail === String(preview.email).toLowerCase()) {
      autoAcceptedRef.current = true;
      handleAccept();
    }
  }, [user, preview, token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !preview) return;
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setAuthBusy(true);
    const { error } = await supabase.auth.signUp({
      email: preview.email,
      password,
      options: {
        data: { full_name: name || preview.email, invitation_token: token },
        emailRedirectTo: `${window.location.origin}/invite/${token}`,
      },
    });
    setAuthBusy(false);
    if (error) {
      if (/registered|exists/i.test(error.message)) {
        toast.info('Ya tienes una cuenta — inicia sesión');
        setMode('login');
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('Cuenta creada. Asociando a la organización…');
    // onAuthStateChange will set `user`, then the auto-accept effect runs
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: preview.email, password });
    setAuthBusy(false);
    if (error) { toast.error('Credenciales incorrectas'); return; }
  };

  if (loading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-emergency" /></div>;
  }

  if (error || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="console-panel p-8 max-w-sm text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">{error ?? 'Invitación inválida'}</h2>
          <Link to="/login"><Button variant="outline">Ir al inicio</Button></Link>
        </div>
      </div>
    );
  }

  const expired = new Date(preview.expires_at) < new Date();
  const status = preview.status as string;
  const wrongEmail = user && (user.email || '').toLowerCase() !== String(preview.email).toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Invitación a una Organización</h1>
        </div>

        <div className="console-panel p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Organización</p>
            <p className="text-base font-semibold text-foreground">{preview.organization_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Rol</p>
              <p className="text-sm font-medium text-foreground">{ROLE_LABELS[preview.role] ?? preview.role}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Para</p>
              <p className="text-sm font-medium text-foreground truncate">{preview.email}</p>
            </div>
          </div>

          {status !== 'pending' && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3">
              <p className="text-xs text-warning">Esta invitación ya fue {status}.</p>
            </div>
          )}
          {status === 'pending' && expired && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-xs text-destructive">Esta invitación expiró.</p>
            </div>
          )}

          {status === 'pending' && !expired && (
            <>
              {!user ? (
                <div className="space-y-3">
                  <div className="flex gap-2 border-b border-border">
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`flex-1 pb-2 text-xs font-semibold ${mode === 'signup' ? 'text-emergency border-b-2 border-emergency' : 'text-muted-foreground'}`}
                    >
                      Crear cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 pb-2 text-xs font-semibold ${mode === 'login' ? 'text-emergency border-b-2 border-emergency' : 'text-muted-foreground'}`}
                    >
                      Ya tengo cuenta
                    </button>
                  </div>

                  {mode === 'signup' ? (
                    <form onSubmit={handleSignup} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Tu nombre</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required className="bg-muted/50" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                        <Input value={preview.email} disabled className="bg-muted/30" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Contraseña</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} className="bg-muted/50" />
                      </div>
                      <Button type="submit" disabled={authBusy} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
                        {authBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Crear cuenta y unirme
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                        <Input value={preview.email} disabled className="bg-muted/30" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Contraseña</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="bg-muted/50" />
                      </div>
                      <Button type="submit" disabled={authBusy} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
                        {authBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                        Iniciar sesión y unirme
                      </Button>
                    </form>
                  )}
                </div>
              ) : wrongEmail ? (
                <div className="space-y-2">
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
                    <p className="text-xs text-destructive">
                      Esta invitación es para <strong>{preview.email}</strong> pero estás conectado como <strong>{user.email}</strong>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => { await supabase.auth.signOut(); }}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              ) : (
                <Button onClick={handleAccept} disabled={accepting} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
                  {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aceptar invitación
                </Button>
              )}
            </>
          )}

          {(status !== 'pending' || expired) && (
            <Link to="/"><Button variant="outline" className="w-full">Volver</Button></Link>
          )}
        </div>
      </div>
    </div>
  );
}
