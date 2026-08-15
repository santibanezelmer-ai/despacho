// Static, non-interactive UI mockups that mimic real Operix screens.
// Purely presentational — no data fetching, no app logic.
import { Siren, Truck, MapPin, Radio, Bell, Users, Tv, BarChart3, Clock, Droplets, Wrench, FileText } from 'lucide-react';

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-[hsl(220_20%_7%)] overflow-hidden shadow-[0_10px_30px_-15px_hsl(0_0%_0%/0.6)]">
      <div className="flex items-center gap-1.5 border-b border-border/40 bg-card/70 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emergency/70" />
        <span className="h-2 w-2 rounded-full bg-warning/60" />
        <span className="h-2 w-2 rounded-full bg-success/60" />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Pill({ tone = 'emergency', children }: { tone?: 'emergency' | 'warning' | 'success' | 'info'; children: React.ReactNode }) {
  const tones = {
    emergency: 'bg-emergency/15 text-emergency border-emergency/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    success: 'bg-success/15 text-success border-success/30',
    info: 'bg-info/15 text-info border-info/30',
  } as const;
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${tones[tone]}`}>{children}</span>
  );
}

function MapCanvas({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-border/40 bg-[hsl(220_24%_9%)]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(hsl(210 20% 92% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(210 20% 92% / 0.06) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="absolute -left-6 top-10 h-10 w-[130%] -rotate-6 bg-[hsl(220_14%_14%)]" />
      <div className="absolute left-1/3 top-0 h-full w-8 rotate-12 bg-[hsl(220_14%_14%)]" />
      {children}
    </div>
  );
}

/* 1. Consola de Despacho */
export function DispatchMock() {
  return (
    <Frame label="Consola de Despacho">
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {[
          { l: 'Activas', v: '3', i: Siren },
          { l: 'Móviles', v: '7/9', i: Truck },
          { l: 'Personal', v: '24', i: Users },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border/40 bg-card/60 px-2 py-1.5">
            <s.i className="h-3 w-3 text-emergency" />
            <p className="mt-1 font-mono text-sm font-bold leading-none text-foreground">{s.v}</p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {['10-0', '10-1', '6-16', '9-1', '10-6', '2-1', '5-3', '10-9'].map((k, i) => (
          <div
            key={k}
            className={`rounded-md border py-1.5 text-center font-mono text-[10px] font-bold ${
              i === 0 ? 'border-emergency/50 bg-emergency/15 text-emergency' : 'border-border/40 bg-card/50 text-muted-foreground'
            }`}
          >
            {k}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* 2. Mapa Operativo */
export function OperativeMapMock() {
  return (
    <Frame label="Mapa Operativo">
      <MapCanvas>
        <span className="absolute left-[28%] top-[30%] flex h-4 w-4 items-center justify-center rounded-full bg-emergency shadow-[0_0_16px_hsl(0_85%_55%/0.8)]">
          <Siren className="h-2.5 w-2.5 text-emergency-foreground" />
        </span>
        <span className="absolute left-[26%] top-[28%] h-8 w-8 animate-ping rounded-full border border-emergency/50" />
        <span className="absolute left-[62%] top-[55%] flex h-4 w-4 items-center justify-center rounded-full bg-warning">
          <Truck className="h-2.5 w-2.5 text-warning-foreground" />
        </span>
        <span className="absolute left-[75%] top-[24%] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-info">
          <Droplets className="h-2 w-2 text-info-foreground" />
        </span>
        <span className="absolute left-[46%] top-[70%] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-info">
          <Droplets className="h-2 w-2 text-info-foreground" />
        </span>
        <div className="absolute bottom-1.5 left-1.5 flex gap-1">
          <Pill>Emergencia</Pill>
          <Pill tone="info">Grifos</Pill>
          <Pill tone="warning">Cuarteles</Pill>
        </div>
      </MapCanvas>
    </Frame>
  );
}

/* 3. Localización del Afectado */
export function LocationShareMock() {
  return (
    <Frame label="Localización del Afectado">
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-2 py-1.5">
        <MapPin className="h-3 w-3 shrink-0 text-emergency" />
        <span className="truncate font-mono text-[9px] text-muted-foreground">operixdispatch.com/location/8f2a…</span>
        <span className="ml-auto shrink-0"><Pill tone="success">En vivo</Pill></span>
      </div>
      <MapCanvas>
        <span className="absolute left-[52%] top-[42%] h-3 w-3 rounded-full bg-success shadow-[0_0_14px_hsl(145_65%_42%/0.9)]" />
        <span className="absolute left-[49%] top-[39%] h-9 w-9 animate-ping rounded-full border border-success/40" />
        <div className="absolute bottom-1.5 left-1.5 rounded-md border border-border/40 bg-background/80 px-1.5 py-1">
          <p className="font-mono text-[8px] text-foreground">-33.4489, -70.6693</p>
          <p className="font-mono text-[8px] text-muted-foreground">Precisión 8 m · 5 s</p>
        </div>
      </MapCanvas>
    </Frame>
  );
}

/* 4. Notificaciones y Tonos */
export function NotificationsMock() {
  return (
    <Frame label="Notificaciones y Tonos">
      <div className="space-y-1.5">
        <div className="rounded-lg border border-emergency/40 bg-emergency/10 p-2">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3 w-3 text-emergency" />
            <span className="text-[10px] font-bold text-foreground">Despacho 10-0 · Estructural</span>
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground">Av. Libertad 1420 · B-1, B-3 asignados</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 p-2">
          <Radio className="h-3 w-3 text-emergency" />
          <div className="flex h-5 flex-1 items-end gap-[2px]">
            {[5, 11, 7, 16, 9, 19, 12, 8, 15, 6, 13, 10, 18, 7, 12].map((h, i) => (
              <span key={i} className="w-full rounded-sm bg-emergency/60" style={{ height: `${h * 5}%` }} />
            ))}
          </div>
          <span className="font-mono text-[8px] text-muted-foreground">tono</span>
        </div>
        <div className="flex gap-1">
          <Pill>Push</Pill>
          <Pill tone="warning">Sirena</Pill>
          <Pill tone="info">Pantalla bloqueada</Pill>
        </div>
      </div>
    </Frame>
  );
}

/* 5. App / PWA Voluntarios */
export function VolunteerAppMock() {
  return (
    <Frame label="App Voluntarios">
      <div className="mx-auto w-[62%] rounded-[14px] border border-border/60 bg-[hsl(0_0%_4%)] p-1.5">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Activas</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emergency" />
        </div>
        <div className="rounded-lg border border-emergency/40 bg-gradient-to-b from-emergency/15 to-transparent p-2">
          <p className="text-[10px] font-bold text-foreground">10-0 Incendio Estructural</p>
          <p className="mt-0.5 text-[8px] text-muted-foreground">Av. Libertad 1420</p>
          <div className="mt-1.5 flex gap-1">
            <Pill>B-1</Pill>
            <Pill tone="warning">B-3</Pill>
          </div>
        </div>
        <div className="mt-1.5 rounded-lg border border-border/50 bg-card/50 p-2">
          <p className="text-[9px] font-semibold text-foreground">6-16 Falsa alarma</p>
          <p className="text-[8px] text-muted-foreground">Cerrada · 14:02</p>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1 border-t border-border/40 pt-1.5">
          {[Siren, MapPin, Clock, Users].map((I, i) => (
            <I key={i} className={`mx-auto h-3 w-3 ${i === 0 ? 'text-emergency' : 'text-muted-foreground'}`} />
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* 6. Gestión de Recursos */
export function ResourcesMock() {
  const rows = [
    { u: 'B-1', t: 'Bomba', s: 'En ruta', tone: 'warning' as const },
    { u: 'B-3', t: 'Bomba', s: 'En trabajo', tone: 'emergency' as const },
    { u: 'R-2', t: 'Rescate', s: 'Disponible', tone: 'success' as const },
    { u: 'Q-1', t: 'Escala', s: 'Mantención', tone: 'info' as const },
  ];
  return (
    <Frame label="Gestión de Recursos">
      <div className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/40">
        {rows.map((r) => (
          <div key={r.u} className="flex items-center gap-2 bg-card/40 px-2 py-1.5">
            <Truck className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] font-bold text-foreground">{r.u}</span>
            <span className="text-[9px] text-muted-foreground">{r.t}</span>
            <span className="ml-auto"><Pill tone={r.tone}>{r.s}</Pill></span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-muted-foreground">
        <Wrench className="h-3 w-3" /> Equipamiento e inventario por móvil
      </div>
    </Frame>
  );
}

/* 7. Pantalla de Cuartel */
export function TvScreenMock() {
  return (
    <Frame label="Pantalla de Cuartel">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="col-span-2 rounded-lg border border-emergency/40 bg-emergency/10 p-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-emergency">10-0</span>
            <span className="font-mono text-sm font-bold text-foreground">00:07:42</span>
          </div>
          <p className="mt-1 text-[9px] text-foreground">Incendio Estructural</p>
          <p className="text-[8px] text-muted-foreground">Av. Libertad 1420</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <Tv className="h-3 w-3 text-muted-foreground" />
          <p className="mt-1 font-mono text-[8px] text-muted-foreground">Cuartel</p>
          <p className="font-mono text-[10px] font-bold text-foreground">Cía. 1</p>
        </div>
        {['B-1 En ruta', 'B-3 En trabajo', 'R-2 Disponible'].map((t, i) => (
          <div key={t} className="rounded-md border border-border/40 bg-card/40 px-1.5 py-1 text-center font-mono text-[8px] text-muted-foreground">
            <span className={i === 1 ? 'text-emergency' : ''}>{t}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* 8. Reportes y Trazabilidad */
export function ReportsMock() {
  const bars = [40, 65, 50, 80, 60, 95, 72];
  return (
    <Frame label="Reportes y Trazabilidad">
      <div className="flex h-20 items-end gap-1.5 rounded-lg border border-border/40 bg-card/40 p-2">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emergency/30 to-emergency/80" style={{ height: `${b}%` }} />
        ))}
      </div>
      <div className="mt-1.5 space-y-1">
        {[
          { t: 'EMG-2026-0142 · Finalizada', i: FileText },
          { t: 'Auditoría · 18 eventos registrados', i: BarChart3 },
        ].map((r) => (
          <div key={r.t} className="flex items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-2 py-1">
            <r.i className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[9px] text-muted-foreground">{r.t}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}
