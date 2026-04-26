import { useDemoStatus } from "@/hooks/useDemoStatus";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";

export default function DemoBanner() {
  const { data } = useDemoStatus();
  if (!data?.isDemo) return null;

  const danger = data.expired || data.limitReached || data.daysLeft <= 1;

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-1.5 text-xs font-mono ${
        danger
          ? "bg-destructive/15 border-destructive/40 text-destructive"
          : "bg-warning/10 border-warning/30 text-warning-foreground"
      }`}
    >
      {danger ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      <span className="font-bold uppercase tracking-wider">Modo Demo</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {data.expired ? "Expirado" : `${data.daysLeft} día${data.daysLeft === 1 ? "" : "s"} restante${data.daysLeft === 1 ? "" : "s"}`}
      </span>
      <span>·</span>
      <span>
        Emergencias: {data.emergenciesUsed}/{data.maxEmergencies}
      </span>
      <span className="ml-auto opacity-80 hidden sm:inline">
        Solicita tu organización real desde el registro para producción.
      </span>
    </div>
  );
}
