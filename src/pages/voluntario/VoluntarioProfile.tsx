import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, LogOut, Volume2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { registerVolunteerPush, requestNotificationPermission, isPushSupported } from '@/services/fcmWebPush';

interface Props { organizationId: string; orgName: string }

const SOUND_KEY = 'voluntario_sound_enabled';

export default function VoluntarioProfile({ organizationId, orgName }: Props) {
  const { user, signOut } = useAuth();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [enabling, setEnabling] = useState(false);
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== 'false');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const enablePush = async () => {
    if (!user) return;
    setEnabling(true);
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      const token = await registerVolunteerPush(organizationId, user.id);
      toast[token ? 'success' : 'error'](token ? 'Notificaciones activadas' : 'No se pudo activar push');
    } else {
      toast.error('Permiso de notificaciones denegado');
    }
    setEnabling(false);
  };

  const testNotif = () => {
    if (notifPerm !== 'granted') { toast.error('Activa primero las notificaciones'); return; }
    new Notification('Operix Voluntario', { body: 'Esto es una notificación de prueba', icon: '/voluntario-icon-512.png' });
  };

  const install = async () => {
    if (!installPrompt) { toast('Ya está instalada o tu navegador no lo permite ahora'); return; }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') toast.success('App instalada');
    setInstallPrompt(null);
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Revisa tu email para cambiar tu contraseña');
  };

  return (
    <div className="px-4 py-4 max-w-md mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
        <p className="text-xs text-muted-foreground">{orgName}</p>
      </header>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Notificaciones</h2>

        {!isPushSupported() ? (
          <p className="text-xs text-muted-foreground">Tu navegador no soporta notificaciones push, o la configuración de Firebase aún no está cargada.</p>
        ) : notifPerm === 'granted' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success text-sm"><Bell className="h-4 w-4" /> Activadas</div>
            <Button size="sm" variant="outline" onClick={testNotif}>Probar</Button>
          </div>
        ) : (
          <Button onClick={enablePush} disabled={enabling} className="w-full h-12 bg-emergency text-emergency-foreground hover:bg-emergency/90">
            {enabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
            Activar notificaciones
          </Button>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm"><Volume2 className="h-4 w-4 text-muted-foreground" /> Sonido</div>
          <Switch checked={sound} onCheckedChange={(v) => { setSound(v); localStorage.setItem(SOUND_KEY, String(v)); }} />
        </div>
      </section>

      {installPrompt && (
        <Button onClick={install} variant="outline" className="w-full h-12">
          <Download className="h-4 w-4 mr-2" /> Instalar app en este dispositivo
        </Button>
      )}

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Cuenta</h2>
        <Button variant="outline" className="w-full" onClick={sendReset}>Cambiar contraseña</Button>
        <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
        </Button>
      </section>

      <p className="text-center text-[10px] text-muted-foreground pt-2">Operix Voluntario · solo lectura</p>
    </div>
  );
}
