import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DemoSettingsAdmin() {
  const { isSuperadmin } = useAuth();
  const [duration, setDuration] = useState(14);
  const [maxEmg, setMaxEmg] = useState(20);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("demo_settings")
        .select("duration_days, max_emergencies, enabled")
        .maybeSingle();
      if (data) {
        setDuration(data.duration_days);
        setMaxEmg(data.max_emergencies);
        setEnabled(data.enabled);
      }
      setLoading(false);
    })();
  }, []);

  if (!isSuperadmin) return null;

  const save = async () => {
    setSaving(true);
    const { data: existing } = await (supabase as any)
      .from("demo_settings")
      .select("id")
      .maybeSingle();
    if (!existing) {
      toast.error("No se encontró la configuración demo");
      setSaving(false);
      return;
    }
    const { error } = await (supabase as any)
      .from("demo_settings")
      .update({
        duration_days: duration,
        max_emergencies: maxEmg,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    setSaving(false);
    if (error) toast.error("Error guardando: " + error.message);
    else toast.success("Configuración demo actualizada");
  };

  if (loading) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-warning" />
        <h3 className="text-base font-semibold">Modo Demo (Superadmin)</h3>
      </div>

      <div className="grid gap-4 max-w-md">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="text-sm font-medium">Habilitar modo demo</Label>
            <p className="text-xs text-muted-foreground">
              Si está activo, cada nuevo registro recibe una org demo automática.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dur">Duración (días)</Label>
          <Input
            id="dur"
            type="number"
            min={1}
            max={365}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value || "1", 10)))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max">Máximo de emergencias por demo</Label>
          <Input
            id="max"
            type="number"
            min={1}
            max={1000}
            value={maxEmg}
            onChange={(e) => setMaxEmg(Math.max(1, parseInt(e.target.value || "1", 10)))}
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-fit">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </Card>
  );
}
