import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Preferences } from '@capacitor/preferences';

const STORED_CREDS_KEY = 'operix.saved.credentials';

export default function VoluntarioLogin() {
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

  const handleReset = async () => {
    if (!email) { toast.error('Ingresa tu email primero'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Revisa tu email para restablecer tu contraseña');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Helmet><title>Ingresar — Operix Voluntario</title></Helmet>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/voluntario-icon-512.png" alt="Operix Voluntario" className="mx-auto mb-3 h-20 w-20 rounded-2xl" />
          <h1 className="text-2xl font-bold text-foreground">Operix Voluntario</h1>
          <p className="text-xs text-muted-foreground mt-1">Acceso operativo y de voluntarios</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 bg-muted/50" placeholder="voluntario@bomberos.cl" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Contraseña</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-12 bg-muted/50" placeholder="••••••••" />
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

          <Button type="submit" disabled={loading} className="w-full h-12 bg-emergency text-emergency-foreground hover:bg-emergency/90 text-base font-semibold">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
            Ingresar
          </Button>
          <button type="button" onClick={handleReset} className="block w-full text-center text-xs text-emergency hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
          <p className="text-center text-[11px] text-muted-foreground pt-2">
            Tu administrador debe enviarte una invitación para crear tu cuenta de voluntario.
          </p>
        </form>
      </div>
    </div>
  );
}
