import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Siren, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecovery(true);
      }
    });

    // Also check hash for type=recovery (fallback)
    if (window.location.hash.includes('type=recovery')) {
      setHasRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success('Contraseña actualizada correctamente');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  if (!hasRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emergency" />
          <p className="text-sm text-muted-foreground">Verificando enlace de recuperación…</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-sm text-foreground font-medium">Contraseña actualizada. Redirigiendo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Nueva Contraseña</h1>
        </div>

        <form onSubmit={handleSubmit} className="console-panel p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nueva contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-muted/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Confirmar contraseña</label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-muted/50"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
