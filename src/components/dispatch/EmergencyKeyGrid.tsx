import { emergencyKeys } from '@/data/mock-data';
import { Volume2 } from 'lucide-react';

interface Props {
  onSelectKey: (key: typeof emergencyKeys[0]) => void;
}

export default function EmergencyKeyGrid({ onSelectKey }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {emergencyKeys.filter(k => k.active).map((key) => (
        <button
          key={key.id}
          onClick={() => onSelectKey(key)}
          className="emergency-key text-left"
          style={{
            borderColor: key.color,
            background: `linear-gradient(135deg, ${key.color}15, ${key.color}08)`,
          }}
        >
          <div className="flex items-start justify-between">
            <span
              className="inline-block rounded px-2 py-0.5 text-xs font-mono font-bold"
              style={{ backgroundColor: key.color, color: '#fff' }}
            >
              {key.code}
            </span>
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground leading-tight">
            {key.name}
          </p>
        </button>
      ))}
    </div>
  );
}
