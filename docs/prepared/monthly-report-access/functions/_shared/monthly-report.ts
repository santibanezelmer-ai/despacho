export const REPORT_DOMAIN = 'operixdispatch.com';
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

type Participation = { id?: string; organization_id?: string; assigned_at?: string | null; released_at?: string | null; operational_status?: string | null; on_scene_at: string | null; odometer_start: number | null; odometer_end: number | null; vehicle_id: string };
export type ReportEmergency = {
  id: string; dispatched_at: string; finished_at: string | null; status: string;
  emergency_key_id: string | null; emergency_vehicles: Participation[];
};
export type ReportPersonnel = { id: string; emergency_id: string; organization_id: string; role: string | null; company_id: string | null };
export function summarize(rows: ReportEmergency[], personnel: ReportPersonnel[] = []) {
  const responses: number[] = [], durations: number[] = [];
  const byKey: Record<string, number> = {}, byVehicle: Record<string, number> = {};
  let kilometers = 0, kilometerSamples = 0;
  const fleet: Record<string, { services: number; kilometers: number | null; kilometerSamples: number; serviceMinutes: number | null; serviceSamples: number }> = {};
  const byCompany: Record<string, number> = {}, byRole: Record<string, number> = {};
  const seen = new Set<string>();
  for (const p of personnel) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const company = p.company_id ?? "sin-compania", role = p.role || "sin-funcion";
    byCompany[company] = (byCompany[company] ?? 0) + 1;
    byRole[role] = (byRole[role] ?? 0) + 1;
  }
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
      const f = fleet[v.vehicle_id] ??= { services: 0, kilometers: null, kilometerSamples: 0, serviceMinutes: null, serviceSamples: 0 };
      f.services++;
      if (v.odometer_start !== null && v.odometer_end !== null && Number.isFinite(v.odometer_start) && Number.isFinite(v.odometer_end) && v.odometer_start >= 0 && v.odometer_end >= v.odometer_start) {
        const km = v.odometer_end - v.odometer_start;
        kilometers += km; kilometerSamples++; f.kilometers = (f.kilometers ?? 0) + km; f.kilometerSamples++;
      }
      // released_at is also used on reassignment: only confirmed en_cuartel is 6-10.
      const assigned = Date.parse(v.assigned_at ?? ''), released = Date.parse(v.released_at ?? '');
      if (v.operational_status === 'en_cuartel' && Number.isFinite(assigned) && Number.isFinite(released) && released >= assigned) {
        f.serviceMinutes = (f.serviceMinutes ?? 0) + (released - assigned) / 60_000; f.serviceSamples++;
      }
    }
  }
  const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  for (const f of Object.values(fleet)) if (f.serviceMinutes !== null) f.serviceMinutes /= f.serviceSamples;
  return { responseMin: responses.length ? Math.min(...responses) : null, responseMax: responses.length ? Math.max(...responses) : null, missingArrivalPercent: rows.length ? (rows.length - responses.length) / rows.length * 100 : null, kilometerSamples, fleet, byCompany, byRole, assistances: seen.size, total: rows.length, closed: rows.filter(r => ['finalizada', 'en_cuartel'].includes(r.status)).length,
    responseMinutes: avg(responses), responseSamples: responses.length, durationMinutes: avg(durations), kilometers: kilometerSamples ? kilometers : null, byKey, byVehicle };
}

export function variation(current: number | null, prior: number | null) {
  if (current === null || prior === null) return { absolute: null, percent: null };
  return { absolute: current - prior, percent: prior === 0 ? null : (current - prior) / prior * 100 };
}
export function periodBounds(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Período inválido');
  const [year, month] = period.split('-').map(Number);
  return { period, start: midnight(year, month), end: midnight(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1) };
}
