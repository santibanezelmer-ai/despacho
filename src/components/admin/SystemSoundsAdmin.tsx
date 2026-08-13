import { useRef } from 'react';
import { Volume2, Upload, Trash2, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSystemSounds, useUpsertSystemSound, useDeleteSystemSound, SOUND_KEYS } from '@/hooks/useSystemSounds';

export default function SystemSoundsAdmin() {
  const { data: sounds, isLoading } = useSystemSounds();
  const upsert = useUpsertSystemSound();
  const remove = useDeleteSystemSound();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getSound = (key: string) => sounds?.find(s => s.sound_key === key);

  const handleUpload = (key: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      return;
    }
    upsert.mutate({ soundKey: key, file });
  };

  const playSound = (url: string) => {
    try {
      new Audio(url).play().catch(() => undefined);
    } catch {
      /* reproducción no soportada */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-warning" />
        <h2 className="text-sm font-bold text-foreground">Sonidos del Sistema</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Asigna archivos de audio (MP3) a las acciones operativas. Se reproducirán al activar cada botón.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="space-y-3">
          {SOUND_KEYS.map(({ key, label }) => {
            const sound = getSound(key);
            return (
              <div key={key} className="console-panel p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  {sound ? (
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{sound.sound_url.split('/').pop()}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Sin sonido asignado</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {sound && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playSound(sound.sound_url)}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => remove.mutate(key)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <input
                    ref={el => { fileInputRefs.current[key] = el; }}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(key, f);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => fileInputRefs.current[key]?.click()}
                    disabled={upsert.isPending}
                  >
                    {upsert.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
                    {sound ? 'Cambiar' : 'Subir'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
