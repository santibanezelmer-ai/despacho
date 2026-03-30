import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Siren, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error('Credenciales incorrectas');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Central de Bomberos</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">v4.0 — Sistema de Despacho</p>
        </div>

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

          <Button type="submit" disabled={loading} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Ingresar
          </Button>

          <button
            type="button"
            onClick={async () => {
              if (!email) { toast.error('Ingresa tu email primero'); return; }
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
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
