import { periodBounds, previousMonth, summarize, type ReportEmergency, type ReportPersonnel } from './monthly-report.ts';

// The same read-only, explicitly scoped loader serves email, browser and PDF.
export async function loadReport(db: any, orgId: string, period: string) {
  async function all(table: string, select: string, bounds?: { start: string; end: string }) {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      let q = db.from(table).select(select).eq('organization_id', orgId).order('id').range(offset, offset + 499);
      if (bounds) q = q.gte('dispatched_at', bounds.start).lt('dispatched_at', bounds.end);
      const { data, error } = await q;
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }
  const { data: org, error } = await db.from('organizations').select('id,name,status').eq('id', orgId).single();
  if (error) throw error;
  if (org.status !== 'active') throw new Error('Organización no activa');
  const bounds = periodBounds(period), prior = previousMonth(new Date(bounds.start));
  const [currentRows, priorRows, vehicles, personnelRows, volunteers, companies, keys, vehicleNames] = await Promise.all([
    all('emergencies', 'id,dispatched_at,finished_at,status,emergency_key_id', bounds),
    all('emergencies', 'id,dispatched_at,finished_at,status,emergency_key_id', prior),
    all('emergency_vehicles', 'id,emergency_id,organization_id,vehicle_id,assigned_at,released_at,operational_status,on_scene_at,odometer_start,odometer_end'),
    all('emergency_personnel', 'id,emergency_id,emergency_vehicle_id,organization_id,volunteer_id,role'),
    all('volunteers', 'id,company_id'), all('companies', 'id,name'), all('emergency_keys', 'id,code,name'), all('vehicles', 'id,code'),
  ]);
  const volunteerCompanies = new Map(volunteers.map(v => [v.id, v.company_id]));
  const companyIds = new Set(companies.map(c => c.id));
  function metrics(rows: any[]) {
    const ids = new Set(rows.map(e => e.id));
    const validVehicles = vehicles.filter(v => ids.has(v.emergency_id));
    const participationIds = new Set(validVehicles.map(v => v.id));
    const people: ReportPersonnel[] = personnelRows.filter(p => ids.has(p.emergency_id) && volunteerCompanies.has(p.volunteer_id) && (!p.emergency_vehicle_id || participationIds.has(p.emergency_vehicle_id))).map(p => ({
      id: p.id, emergency_id: p.emergency_id, organization_id: orgId, role: p.role,
      company_id: companyIds.has(volunteerCompanies.get(p.volunteer_id)) ? volunteerCompanies.get(p.volunteer_id) : null,
    }));
    const emergencies: ReportEmergency[] = rows.map(e => ({ ...e, emergency_vehicles: validVehicles.filter(v => v.emergency_id === e.id) }));
    return summarize(emergencies, people);
  }
  const labels = Object.fromEntries(keys.map(k => [k.id, `${k.code} · ${k.name}`]));
  return { organizationId: orgId, organizationName: org.name, period, priorPeriod: prior.period, generatedAt: new Date().toISOString(), current: metrics(currentRows), prior: metrics(priorRows), keys: labels, vehicles: Object.fromEntries((vehicleNames ?? []).map((v: any) => [v.id, v.code])), companies: Object.fromEntries(companies.map(c => [c.id, c.name])) };
}
export type MonthlyReport = Awaited<ReturnType<typeof loadReport>>;
