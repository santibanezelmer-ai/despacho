import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

export default function VoluntarioLogin() {
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
          <p className="text-xs text-muted-foreground mt-1">Acceso solo para voluntarios</p>
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
