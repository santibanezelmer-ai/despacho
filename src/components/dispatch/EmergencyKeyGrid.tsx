import { Volume2 } from 'lucide-react';
import { useEmergencyKeys, type EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  onSelectKey: (key: EmergencyKeyRow) => void;
}

export default function EmergencyKeyGrid({ onSelectKey }: Props) {
  const { data: keys, isLoading } = useEmergencyKeys();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {(keys ?? []).map((key) => (
        <button
          key={key.id}
          onClick={() => onSelectKey(key)}
          className="emergency-key text-left"
          style={{
            borderColor: key.color,
            background: `linear-gradient(135deg, ${key.color}15, ${key.color}08)`,
          }}
        >
          <div className="flex items-start justify-between gap-1.5">
            <span
              className={`inline-block rounded px-1.5 py-0.5 font-mono font-bold leading-tight ${
                (key.code?.length || 0) >= 7 ? 'text-[10px]' : (key.code?.length || 0) >= 5 ? 'text-xs' : 'text-sm'
              }`}
              style={{ backgroundColor: key.color, color: '#fff', maxWidth: '100%' }}
            >
              {key.code}
            </span>
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground leading-tight">
            {key.name}
          </p>
        </button>
      ))}
    </div>
  );
}
