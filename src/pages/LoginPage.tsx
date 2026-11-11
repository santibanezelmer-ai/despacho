import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Preferences } from '@capacitor/preferences';

const STORED_CREDS_KEY = 'operix.saved.credentials';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar credenciales guardadas al iniciar la pantalla
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const { value } = await Preferences.get({ key: STORED_CREDS_KEY });
        if (value) {
          const creds = JSON.parse(value);
          if (creds.email && creds.password) {
            setEmail(creds.email);
            setPassword(creds.password);
            setRememberMe(true);
          }
        }
      } catch (err) {
        console.warn('Could not load saved credentials:', err);
      }
    };
    void loadSavedCredentials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Credenciales incorrectas');
    } else {
      // Guardar o eliminar credenciales según el Checkbox
      try {
        if (rememberMe) {
          await Preferences.set({
            key: STORED_CREDS_KEY,
            value: JSON.stringify({ email, password })
          });
        } else {
          await Preferences.remove({ key: STORED_CREDS_KEY });
        }
      } catch (err) {
        console.warn('Error saving credentials:', err);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || 'No se pudo iniciar sesión con Google');
        setLoading(false);
        return;
      }
      if (result.redirected) return; // el navegador redirige a Google
      // Sesión ya establecida: ir a la app
      window.location.href = '/';
    } catch (err) {
      console.warn('Google sign-in failed:', err);
      toast.error('No se pudo iniciar sesión con Google');
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Helmet>
        <title>Iniciar sesión — Operix Despacho</title>
        <meta name="description" content="Accede a la consola de despacho Operix para coordinar emergencias, vehículos y personal de tu cuerpo de bomberos en tiempo real." />
        <link rel="canonical" href="https://operixdispatch.com/login" />
        <meta property="og:url" content="https://operixdispatch.com/login" />
        <meta property="og:title" content="Iniciar sesión — Operix Despacho" />
        <meta property="og:description" content="Accede a la consola de despacho Operix para coordinar emergencias en tiempo real." />
        <meta name="twitter:title" content="Iniciar sesión — Operix Despacho" />
        <meta name="twitter:description" content="Accede a la consola de despacho Operix para coordinar emergencias en tiempo real." />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/favicon.png" alt="Operix" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover" />
          <h1 className="text-xl font-bold text-foreground">Operix — Acceso al Sistema de Despacho</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">v4.0 — Sistema de Despacho</p>
        </div>

        <Link to="/activar" className="mb-4 block rounded-lg border border-emergency/40 bg-emergency/10 p-3 text-center text-sm font-semibold text-foreground">
          ¿Eres voluntario y no tienes cuenta? Activa tu acceso aquí
        </Link>

        <form onSubmit={handleSubmit} className="console-panel p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Iniciar Sesión</h2>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operador@central.cl" required className="bg-muted/50" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Contraseña</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-muted/50" />
          </div>

          <div className="flex items-center space-x-2 py-1">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer font-normal">
              Recordar mis datos de acceso
            </Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Ingresar
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full bg-muted/50 border-border hover:bg-muted"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continuar con Google
          </Button>


          <button
            type="button"
            onClick={async () => {
              if (!email) { toast.error('Ingresa tu email primero'); return; }
              const { error } = await supabase.functions.invoke('request-password-reset', { body: { email, redirect_to: `${window.location.origin}/reset-password` } });
              if (error) toast.error(error.message);
              else toast.success('Revisa tu email para restablecer tu contraseña');
            }}
            className="block w-full text-center text-xs text-emergency hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-emergency hover:underline">Registra tu organización</Link>
          </p>

          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </Link>
        </form>
      </div>
    </div>
  );
}
