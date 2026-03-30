import { useMemo } from 'react';
import { Bell, AlertTriangle, Users, Truck, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { useActiveEmergencies } from '@/hooks/useEmergencies';
import { useVehicles } from '@/hooks/useVehicles';
import { useVolunteers } from '@/hooks/useVolunteers';

type Alert = {
  id: string;
  level: 'critica' | 'alta' | 'media' | 'info';
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  timestamp: Date;
};

const levelConfig = {
  critica: { bg: 'bg-emergency/15', border: 'border-emergency/40', text: 'text-emergency', label: 'CRÍTICA' },
  alta: { bg: 'bg-warning/15', border: 'border-warning/40', text: 'text-warning', label: 'ALTA' },
  media: { bg: 'bg-info/15', border: 'border-info/40', text: 'text-info', label: 'MEDIA' },
  info: { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', label: 'INFO' },
};

export default function AlertsPage() {
  const { data: emergencies } = useActiveEmergencies();
  const { data: vehicles } = useVehicles();
  const { data: volunteers } = useVolunteers();

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    const now = new Date();

    // Check vehicle availability
    const totalVehicles = (vehicles ?? []).length;
    const available = (vehicles ?? []).filter(v => v.status === 'disponible').length;
    const inMaint = (vehicles ?? []).filter(v => v.status === 'mantencion').length;
    const outOfService = (vehicles ?? []).filter(v => v.status === 'fuera_servicio').length;

    if (totalVehicles > 0 && available === 0) {
      list.push({
        id: 'no-vehicles', level: 'critica', icon: Truck,
        title: 'Sin móviles disponibles',
        description: `Todos los ${totalVehicles} móviles están ocupados o fuera de servicio.`,
        timestamp: now,
      });
    } else if (totalVehicles > 0 && available <= 2) {
      list.push({
        id: 'low-vehicles', level: 'alta', icon: Truck,
        title: 'Pocos móviles disponibles',
        description: `Solo ${available} de ${totalVehicles} móviles disponibles.`,
        timestamp: now,
      });
    }

    if (inMaint > 0) {
      list.push({
        id: 'maint-vehicles', level: 'media', icon: Truck,
        title: `${inMaint} móvil(es) en mantención`,
        description: `Hay ${inMaint} móvil(es) actualmente en mantención.`,
        timestamp: now,
      });
    }

    if (outOfService > 0) {
      list.push({
        id: 'oos-vehicles', level: 'alta', icon: Truck,
        title: `${outOfService} móvil(es) fuera de servicio`,
        description: `Hay ${outOfService} móvil(es) marcados como fuera de servicio.`,
        timestamp: now,
      });
    }

    // Check volunteer availability
    const activeVols = (volunteers ?? []).filter(v => v.status === 'activo').length;
    const totalVols = (volunteers ?? []).length;
    const onLeave = (volunteers ?? []).filter(v => v.status === 'licencia').length;

    if (totalVols > 0 && activeVols < 5) {
      list.push({
        id: 'low-personnel', level: 'critica', icon: Users,
        title: 'Personal insuficiente',
        description: `Solo ${activeVols} voluntarios activos de ${totalVols} registrados.`,
        timestamp: now,
      });
    } else if (totalVols > 0 && activeVols < 10) {
      list.push({
        id: 'med-personnel', level: 'alta', icon: Users,
        title: 'Personal reducido',
        description: `${activeVols} voluntarios activos. Se recomienda al menos 10.`,
        timestamp: now,
      });
    }

    if (onLeave > 0) {
      list.push({
        id: 'on-leave', level: 'info', icon: Users,
        title: `${onLeave} voluntario(s) en licencia`,
        description: `Hay ${onLeave} voluntario(s) actualmente con licencia.`,
        timestamp: now,
      });
    }

    // Check emergency response times
    (emergencies ?? []).forEach(e => {
      const created = new Date(e.created_at).getTime();
      const elapsed = now.getTime() - created;
      const minutes = elapsed / 60000;

      if (e.status === 'despacho' && minutes > 10) {
        list.push({
          id: `slow-dispatch-${e.id}`, level: 'critica', icon: Clock,
          title: `Despacho lento: ${e.folio}`,
          description: `Lleva ${Math.round(minutes)} min en estado de despacho sin avanzar.`,
          timestamp: now,
        });
      }

      if (e.status === 'en_ruta' && minutes > 20) {
        list.push({
          id: `slow-route-${e.id}`, level: 'alta', icon: Clock,
          title: `Tiempo en ruta extendido: ${e.folio}`,
          description: `Lleva ${Math.round(minutes)} min total. Verificar estado.`,
          timestamp: now,
        });
      }

      if (minutes > 120) {
        list.push({
          id: `long-emergency-${e.id}`, level: 'alta', icon: AlertTriangle,
          title: `Emergencia prolongada: ${e.folio}`,
          description: `Más de ${Math.round(minutes / 60)} horas activa. Evaluar recursos.`,
          timestamp: now,
        });
      }
    });

    // Multiple simultaneous emergencies
    const activeCount = (emergencies ?? []).length;
    if (activeCount >= 3) {
      list.push({
        id: 'multi-emergency', level: 'critica', icon: AlertTriangle,
        title: 'Múltiples emergencias simultáneas',
        description: `Hay ${activeCount} emergencias activas simultáneamente. Coordinar recursos.`,
        timestamp: now,
      });
    }

    // Sort by severity
    const order = { critica: 0, alta: 1, media: 2, info: 3 };
    list.sort((a, b) => order[a.level] - order[b.level]);

    return list;
  }, [emergencies, vehicles, volunteers]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-warning" />
          Alertas Internas
        </h1>
        <span className="text-xs font-mono text-muted-foreground">
          Actualización automática
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['critica', 'alta', 'media', 'info'] as const).map(level => {
          const count = alerts.filter(a => a.level === level).length;
          const cfg = levelConfig[level];
          return (
            <div key={level} className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</p>
              <p className={`text-3xl font-bold font-mono mt-1 ${cfg.text}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Alert list */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map(alert => {
            const cfg = levelConfig[alert.level];
            const Icon = alert.icon;
            return (
              <div key={alert.id} className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border} flex items-start gap-4`}>
                <div className={`shrink-0 mt-0.5 ${cfg.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{alert.title}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center console-panel">
          <CheckCircle2 className="h-12 w-12 text-success mb-3" />
          <p className="text-lg font-semibold text-success">Todo en orden</p>
          <p className="text-sm text-muted-foreground mt-1">No hay alertas activas en este momento.</p>
        </div>
      )}
    </div>
  );
}
