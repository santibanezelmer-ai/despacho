import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { uploadLogo, deleteLogoPath } from '@/lib/logoStorage';
import { toast } from 'sonner';

interface Props {
  label?: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  orgId: string;
  kind: 'org' | 'company';
  subId?: string;
  disabled?: boolean;
}

export default function LogoUploadField({
  label = 'Logo',
  hint = 'PNG o JPG cuadrado, máx. 3 MB',
  value,
  onChange,
  orgId,
  kind,
  subId,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!orgId) { toast.error('Selecciona una organización primero'); return; }
    setBusy(true);
    try {
      const previous = value && !/^(https?:|data:|blob:)/i.test(value) ? value : null;
      const path = await uploadLogo({ file, orgId, kind, subId });
      onChange(path);
      if (previous && previous !== path) {
        deleteLogoPath(previous).catch(() => { /* best effort */ });
      }
      toast.success('Logo actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el logo');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    setBusy(true);
    try {
      await deleteLogoPath(value);
      onChange(null);
      toast.success('Logo eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el logo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
          <Logo src={value} alt={label} className="max-h-16 max-w-16 object-contain" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {value ? 'Cambiar' : 'Subir logo'}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || busy}
                onClick={handleRemove}
                className="text-xs text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
