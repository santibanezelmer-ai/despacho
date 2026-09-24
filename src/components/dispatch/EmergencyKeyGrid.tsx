import { memo } from 'react';
import { Volume2 } from 'lucide-react';
import { useEmergencyKeys, type EmergencyKeyRow } from '@/hooks/useEmergencyKeys';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  onSelectKey: (key: EmergencyKeyRow) => void;
}

function EmergencyKeyGrid({ onSelectKey }: Props) {
  const { data: keys, isLoading } = useEmergencyKeys();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="flex items-start justify-between gap-2">
            <span
              className="inline-block rounded-md px-3 py-1.5 font-mono font-bold text-xl uppercase tracking-tight"
              style={{ backgroundColor: key.color, color: '#fff', maxWidth: '100%' }}
            >
              {key.code}
            </span>
            <Volume2 className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
          <p className="mt-2.5 text-base font-semibold text-foreground leading-snug">
            {key.name}
          </p>
        </button>
      ))}
    </div>
  );
}

export default memo(EmergencyKeyGrid);
