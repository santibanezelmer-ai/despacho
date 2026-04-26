import { useAuth } from "@/contexts/AuthContext";
import { useDemoStatus } from "@/hooks/useDemoStatus";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * Full-screen overlay shown when an authenticated user is inside an
 * expired demo organization. Blocks all interaction with the app.
 */
export default function DemoExpiredOverlay() {
  const { data } = useDemoStatus();
  const { signOut } = useAuth();

  if (!data?.isDemo || !data.expired) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/95 backdrop-blur p-6">
      <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card shadow-2xl p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Tu demo ha expirado</h2>
        <p className="text-sm text-muted-foreground mb-6">
          El acceso de prueba duró {data.durationDays} día{data.durationDays === 1 ? "" : "s"}.
          Tus datos quedan guardados. Para continuar, solicita tu organización real.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to="/register">Solicitar organización real</Link>
          </Button>
          <Button variant="ghost" onClick={signOut} className="w-full">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
