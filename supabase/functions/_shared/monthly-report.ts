export const REPORT_DOMAIN = 'reportes.operixdispatch.com';
export const REPORT_TIMEZONE = 'America/Santiago';

function localParts(date: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]));
}

function midnight(year: number, month: number) {
  const target = Date.UTC(year, month - 1, 1);
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(instant));
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    instant += target - represented;
  }
  return new Date(instant).toISOString();
}

export function previousMonth(now = new Date()) {
  const p = localParts(now);
  const month = Number(p.month), year = Number(p.year);
  const previous = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return { period: `${previousYear}-${String(previous).padStart(2, '0')}`, start: midnight(previousYear, previous), end: midnight(year, month) };
}

export function monthlyDue(now: Date) {
  const p = localParts(now);
  return Number(p.day) === 1 && Number(p.hour) === 8;
}

export function recipientAllowed(member: { status: string; role: string }) {
  return member.status === 'active' && ['admin', 'oficial'].includes(member.role);
}

type Participation = { on_scene_at: string | null; odometer_start: number | null; odometer_end: number | null; vehicle_id: string };
export type ReportEmergency = {
  id: string; dispatched_at: string; finished_at: string | null; status: string;
  emergency_key_id: string | null; emergency_vehicles: Participation[];
};
export function summarize(rows: ReportEmergency[]) {
  const responses: number[] = [], durations: number[] = [];
  const byKey: Record<string, number> = {}, byVehicle: Record<string, number> = {};
  let kilometers = 0;
  for (const row of rows) {
    const start = Date.parse(row.dispatched_at);
    const arrivals = row.emergency_vehicles.map(v => v.on_scene_at ? Date.parse(v.on_scene_at) : NaN).filter(t => Number.isFinite(t) && t >= start);
    if (arrivals.length) responses.push((Math.min(...arrivals) - start) / 60_000);
    const end = row.finished_at ? Date.parse(row.finished_at) : NaN;
    if (Number.isFinite(end) && end >= start) durations.push((end - start) / 60_000);
    const key = row.emergency_key_id ?? 'sin-clave';
    byKey[key] = (byKey[key] ?? 0) + 1;
    for (const id of new Set(row.emergency_vehicles.map(v => v.vehicle_id))) byVehicle[id] = (byVehicle[id] ?? 0) + 1;
    for (const v of row.emergency_vehicles) {
      if (v.odometer_start !== null && v.odometer_end !== null && v.odometer_end >= v.odometer_start) kilometers += v.odometer_end - v.odometer_start;
    }
  }
  const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return { total: rows.length, closed: rows.filter(r => ['finalizada', 'en_cuartel'].includes(r.status)).length,
    responseMinutes: avg(responses), responseSamples: responses.length, durationMinutes: avg(durations), kilometers, byKey, byVehicle };
}

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export function reportHtml(org: string, period: string, metrics: ReturnType<typeof summarize>, priorTotal: number, keys: Record<string, string>, vehicles: Record<string, string>) {
  const minutes = (n: number | null) => n === null ? 'Sin datos' : `${n.toFixed(1)} min`;
  const list = (counts: Record<string, number>, labels: Record<string, string>) => Object.entries(counts).map(([id, n]) => `<li>${escape(labels[id] ?? 'Sin identificación')}: ${n}</li>`).join('') || '<li>Sin registros</li>';
  return `<!doctype html><html lang="es"><body><h1>Operix · Reporte mensual</h1><h2>${escape(org)}</h2><p>Periodo: ${escape(period)} · Hora de Chile</p><p>Emergencias despachadas: <strong>${metrics.total}</strong> (mes anterior: ${priorTotal})</p><p>Cerradas: ${metrics.closed}</p><p>Despacho a primera llegada 6-3: ${minutes(metrics.responseMinutes)} (${metrics.responseSamples} registros)</p><p>Duración promedio de emergencias finalizadas: ${minutes(metrics.durationMinutes)}</p><p>Kilómetros registrados: ${metrics.kilometers}</p><h3>Por clave</h3><ul>${list(metrics.byKey, keys)}</ul><h3>Participación de móviles</h3><ul>${list(metrics.byVehicle, vehicles)}</ul><p>Resumen operativo de tu organización. No incluye teléfonos ni datos personales del personal o de llamantes.</p></body></html>`;
}