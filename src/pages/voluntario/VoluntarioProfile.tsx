import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, LogOut, Volume2, Loader2, Download, Play, RotateCcw, Upload, Info, BatteryWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { registerVolunteerPush, requestNotificationPermission, isPushSupported } from '@/services/fcmWebPush';
import {
  CUSTOM_TONE_KEY,
  DEFAULT_DISPATCH_TONE_URL,
  getActiveDispatchToneUrl,
  playDefaultDispatchTone,
} from '@/services/defaultDispatchTone';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';

interface Props { organizationId: string; orgName: string }

const SOUND_KEY = 'voluntario_sound_enabled';

export default function VoluntarioProfile({ organizationId, orgName }: Props) {
  const { user, signOut } = useAuth();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [enabling, setEnabling] = useState(false);
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== 'false');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [toneUrl, setToneUrl] = useState<string>(() => getActiveDispatchToneUrl());
  const [uploadingTone, setUploadingTone] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [androidPlatform, setAndroidPlatform] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const isCustomTone = toneUrl !== DEFAULT_DISPATCH_TONE_URL;

  const previewTone = () => {
    try { new Audio(toneUrl).play().catch(() => toast.error('No se pudo reproducir')); } catch { /* ignore */ }
  };

  const resetTone = () => {
    localStorage.removeItem(CUSTOM_TONE_KEY);
    setToneUrl(DEFAULT_DISPATCH_TONE_URL);
    toast.success('Tono predeterminado restaurado');
  };

  const onPickTone = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) { toast.error('Debe ser un archivo de audio'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2 MB'); return; }
    setUploadingTone(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      localStorage.setItem(CUSTOM_TONE_KEY, dataUrl);
      setToneUrl(dataUrl);
      toast.success('Tono personalizado guardado en este dispositivo');
    } catch {
      toast.error('No se pudo guardar el tono');
    } finally {
      setUploadingTone(false);
    }
  };


  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);

    const getVersion = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await CapacitorApp.getInfo();
          setAppVersion(`v${info.version}`);
          const devInfo = await Device.getInfo();
          setAndroidPlatform(devInfo.manufacturer.toLowerCase());
        } catch (e) {}
      } else {
        setAppVersion('Versión Web');
      }
    };
    getVersion();

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const enablePush = async () => {
    if (!user) return;
    if (isNative) {
      toast.info('Las notificaciones nativas se manejan automáticamente al iniciar sesión.');
      return;
    }
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
    if (isNative) {
      toast.info('Para probar notificaciones nativas usa la opción Simular Alerta abajo.');
      return;
    }
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

        {isNative ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success text-sm"><Bell className="h-4 w-4" /> Activadas</div>
          </div>
        ) : !isPushSupported() ? (
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

      {isNative && ['samsung', 'xiaomi', 'huawei', 'oppo'].includes(androidPlatform) && (
        <section className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <BatteryWarning className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-warning">Evita que tu celular apague las alertas</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Tu dispositivo <b>{androidPlatform.charAt(0).toUpperCase() + androidPlatform.slice(1)}</b> podría bloquear notificaciones en segundo plano por el "Ahorro de batería".
                Asegúrate de ir a la información de esta app y seleccionar <b>Batería: Sin restricciones</b>.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Tono de despacho</h2>
          <span className="text-[10px] text-muted-foreground">{isCustomTone ? 'Personalizado' : 'Predeterminado'}</span>
        </div>
        <p className="text-xs text-muted-foreground">Se reproduce en este dispositivo cuando llega una nueva emergencia.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={previewTone}>
            <Play className="h-3.5 w-3.5 mr-1" /> Probar
          </Button>
          <Button variant="outline" size="sm" onClick={() => playDefaultDispatchTone()}>
            <Bell className="h-3.5 w-3.5 mr-1" /> Simular alerta
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={onPickTone} />
        <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingTone}>
          {uploadingTone ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
          Cambiar tono (MP3, máx 2 MB)
        </Button>
        {isCustomTone && (
          <Button variant="ghost" size="sm" className="w-full" onClick={resetTone}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Usar tono predeterminado
          </Button>
        )}
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

      <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
        <p className="text-center text-[10px] text-muted-foreground">Operix Voluntario · solo lectura</p>
        {appVersion && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-70">
            <Info className="h-3.5 w-3.5" />
            <span>Operix Dispatch {appVersion}</span>
          </div>
        )}
      </div>
    </div>
  );
}
