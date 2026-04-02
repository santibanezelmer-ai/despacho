import { ClipboardCheck } from 'lucide-react';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';

export default function OnboardingPage() {
  return (
    <div className="space-y-6 p-1 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Configuración inicial</h1>
          <p className="text-xs text-muted-foreground">Completa estos pasos para que tu organización pueda operar</p>
        </div>
      </div>
      <OnboardingChecklist />
    </div>
  );
}
