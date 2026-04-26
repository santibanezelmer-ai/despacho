import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Volume2 } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface ToneUploadFieldProps {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onPlay: (url: string) => void;
  uploading?: boolean;
}

/**
 * Reusable MP3 tone selector with URL input, file upload and preview button.
 * Used by Companies and EmergencyKeys admin dialogs.
 */
export default function ToneUploadField({
  label = 'Tono (MP3)',
  value,
  onChange,
  onUpload,
  onPlay,
  uploading = false,
}: ToneUploadFieldProps) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL o subir archivo"
          className="bg-muted/50 text-xs flex-1"
        />
        <label className="cursor-pointer">
          <input type="file" accept="audio/*" className="hidden" onChange={onUpload} />
          <Button size="sm" variant="outline" className="h-8 px-2" asChild disabled={uploading}>
            <span>
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </span>
          </Button>
        </label>
        {value && (
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onPlay(value)}>
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
