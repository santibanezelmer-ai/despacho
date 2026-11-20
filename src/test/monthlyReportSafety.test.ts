import { describe, it, expect, vi } from 'vitest';
import { summarize, variation, periodBounds, type ReportEmergency } from '../../supabase/functions/_shared/monthly-report';
import { sendResend, SENDERS } from '../../supabase/functions/_shared/resend-service';
import { loadReport } from '../../supabase/functions/_shared/report-data';
import { deliverMonthlyReport } from '../../supabase/functions/_shared/report-delivery';
import { createMonthlyReportPdf } from '../lib/monthlyReportPdf';
const emergency: ReportEmergency = { id: 'e', dispatched_at: '2026-11-10T10:00:00Z', finished_at: '2026-11-10T12:00:00Z', status: 'finalizada', emergency_key_id: 'k', emergency_vehicles: [] };
describe('monthly report approved rules', () => {
  it('blocks delivery before any database write', async () => { const db={from:vi.fn()}; await expect(deliverMonthlyReport(db,{} as any,'user',()=>undefined)).rejects.toThrow('desactivados'); expect(db.from).not.toHaveBeenCalled(); });
  it('generates a nonempty PDF for the requested real period', () => { const m=summarize([emergency]); const doc=createMonthlyReportPdf({organizationId:'org',organizationName:'Org',period:'2026-11',priorPeriod:'2026-10',generatedAt:'2026-11-20T02:00:00Z',current:m,prior:summarize([]),keys:{},vehicles:{},companies:{}}); expect(doc.output()).toContain('2026-11'); expect(doc.getNumberOfPages()).toBeGreaterThan(0); expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000); });
  it('computes mean min max arrival coverage by emergency, not by vehicle', () => {
    const rows = [6,10,null].map((n,i) => ({ ...emergency, id: String(i), emergency_vehicles: n === null ? [] : [{vehicle_id:'v',on_scene_at:`2026-11-10T10:${String(n).padStart(2,'0')}:00Z`,odometer_start:null,odometer_end:null}] }));
    const m=summarize(rows); expect(m.responseMinutes).toBe(8); expect(m.responseMin).toBe(6); expect(m.responseMax).toBe(10); expect(m.responseSamples).toBe(2); expect(m.missingArrivalPercent).toBeCloseTo(100/3);
  });
  it('never substitutes emergency finish for missing 6-10 or reassignment', () => {
    const m=summarize([{...emergency,emergency_vehicles:[{vehicle_id:'v',assigned_at:emergency.dispatched_at,released_at:'2026-11-10T11:00:00Z',operational_status:'en_ruta',on_scene_at:null,odometer_start:null,odometer_end:null}]}]);
    expect(m.fleet.v.serviceMinutes).toBeNull(); expect(m.kilometers).toBeNull();
  });
  it('measures service separately from 6-3', () => {
    const m=summarize([{...emergency,emergency_vehicles:[{vehicle_id:'v',assigned_at:emergency.dispatched_at,released_at:'2026-11-10T11:00:00Z',operational_status:'en_cuartel',on_scene_at:'2026-11-10T10:06:00Z',odometer_start:100,odometer_end:125}]}]);
    expect(m.responseMinutes).toBe(6); expect(m.fleet.v.serviceMinutes).toBe(60); expect(m.kilometers).toBe(25);
  });
  it('counts personnel participations, deduplicating only the row id', () => {
    const p={id:'p1',emergency_id:'e',organization_id:'org',role:'conductor',company_id:'c'};
    const m=summarize([emergency],[p,p,{...p,id:'p2'}]); expect(m.assistances).toBe(2); expect(m.byCompany.c).toBe(2); expect(m.byRole.conductor).toBe(2);
  });
  it('does not invent missing percentages or missing samples', () => { expect(variation(4,0)).toEqual({absolute:4,percent:null}); expect(variation(null,4)).toEqual({absolute:null,percent:null}); expect(summarize([]).missingArrivalPercent).toBeNull(); });
  it('uses only the root domain and blocks all real deliveries before transport', async () => { expect(Object.values(SENDERS)).toEqual(['reportes@operixdispatch.com','notificaciones@operixdispatch.com','despacho@operixdispatch.com']); const transport=vi.fn(); await expect(sendResend({channel:'reports',to:'qa@example.test',subject:'test',html:'',eventKey:'e'},()=> 'secret',transport)).rejects.toThrow('desactivados'); expect(transport).not.toHaveBeenCalled(); });
  it('validates requested month and preserves Chile boundaries', () => { expect(periodBounds('2026-11').start).toBe('2026-11-01T03:00:00.000Z'); expect(()=>periodBounds('2026-13')).toThrow(); });
  it('scopes all loader queries and excludes inconsistent cross-organization links', async () => {
    const scope: string[]=[];
    const tables: Record<string,any[]> = { organizations:[{id:'org',name:'Org',status:'active'}],emergencies:[emergency],emergency_vehicles:[],emergency_personnel:[{id:'p',emergency_id:'e',volunteer_id:'foreign',organization_id:'org',role:'conductor'}],volunteers:[],companies:[],emergency_keys:[],vehicles:[] };
    const db={from:(name:string)=> { const q:any={select:()=>q,eq:(field:string,value:string)=>{ if(name!=='organizations'){expect(field).toBe('organization_id');expect(value).toBe('org');scope.push(name);} return q;},order:()=>q,range:()=>q,gte:()=>q,lt:()=>q,single:async()=>({data:tables[name][0],error:null}),then:(resolve:any)=>resolve({data:tables[name],error:null})};return q;}};
    const r=await loadReport(db,'org','2026-11'); expect(r.current.assistances).toBe(0); expect(scope).toContain('emergency_personnel'); expect(scope).toContain('volunteers');
  });
});
