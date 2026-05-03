import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Siren, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Visor',
};

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error } = await (supabase as any).rpc('accept_invitation', { _token: token });
    if (error) {
      toast.error(error.message);
      setAccepting(false);
      return;
    }
    toast.success('¡Bienvenido a la organización!');
    setTimeout(() => navigate('/'), 800);
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

          {!user ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Inicia sesión o crea una cuenta con <strong>{preview.email}</strong> para aceptar.
              </p>
              <div className="flex gap-2">
                <Link to={`/login?redirect=/invite/${token}`} className="flex-1">
                  <Button className="w-full" variant="outline">Iniciar sesión</Button>
                </Link>
                <Link to={`/register?redirect=/invite/${token}`} className="flex-1">
                  <Button className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">Crear cuenta</Button>
                </Link>
              </div>
            </div>
          ) : status === 'pending' && !expired ? (
            <Button onClick={handleAccept} disabled={accepting} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
              {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aceptar invitación
            </Button>
          ) : (
            <Link to="/"><Button variant="outline" className="w-full">Volver</Button></Link>
          )}
        </div>
      </div>
    </div>
  );
}
