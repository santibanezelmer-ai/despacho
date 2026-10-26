import type { AccessRole } from './rolePermissions';
import { supabase } from '@/integrations/supabase/client';

/** SQL installed; real-session write authorization not yet validated. Writes stay blocked. */
export const COMPANY_DUTY_INTEGRATION = Object.freeze({
  operationsEnabled: false,
  message: 'Guardias en modo consulta. Las acciones que guardan cambios siguen bloqueadas.',
});

type ShiftState = 'borrador' | 'publicado' | 'en_curso' | 'finalizado' | 'cancelado';
type ShiftMode = 'presencial' | 'domiciliaria' | 'mixta';
export interface DutyDraftSlot {
  role: string; mode: Exclude<ShiftMode, 'mixta'>; start: string; end: string;
  capacity: number; critical: boolean; specialties: string[];
}
export type DutyCommand =
  | { kind: 'createDraft'; companyId: string; name: string; start: string; end: string; mode: ShiftMode; slots: DutyDraftSlot[] }
  | { kind: 'createShift'; companyId: string; name: string; start: string; end: string; mode: ShiftMode }
  | { kind: 'createSlot'; shiftId: string; role: string; mode: Exclude<ShiftMode, 'mixta'>; start: string; end: string; capacity: number; critical: boolean; specialties: string[] }
  | { kind: 'publish'; shiftId: string; expected: 'borrador'; reason: string }
  | { kind: 'cancel'; shiftId: string; expected: Exclude<ShiftState, 'finalizado' | 'cancelado'>; reason: string }
  | { kind: 'assign'; slotId: string; volunteerId: string }
  | { kind: 'confirm'; assignmentId: string; accept: boolean; reason: string };

/** Exact v3 public RPC arguments. Actor and authorization are derived by SQL, never sent by the client.
 * createDraft requires the unapplied v3 atomic supplement; never chain createShift/createSlot to save a draft.
 * Timestamps must already be timezone-qualified (datetime-local values need conversion before integration).
 */
export function dutyRpcContract(orgId: string, command: DutyCommand) {
  switch (command.kind) {
    case 'createDraft': return { name: 'guard_create_draft', args: { _org: orgId, _company: command.companyId, _name: command.name, _start: command.start, _end: command.end, _mode: command.mode, _slots: command.slots.map(slot => ({ role: slot.role, mode: slot.mode, start: slot.start, end: slot.end, capacity: slot.capacity, critical: slot.critical, specialties: slot.specialties })) } };
    case 'createShift': return { name: 'guard_create_shift', args: { _org: orgId, _company: command.companyId, _name: command.name, _start: command.start, _end: command.end, _mode: command.mode } };
    case 'createSlot': return { name: 'guard_create_slot', args: { _org: orgId, _shift: command.shiftId, _role: command.role, _mode: command.mode, _start: command.start, _end: command.end, _capacity: command.capacity, _critical: command.critical, _specialties: command.specialties } };
    case 'publish': return { name: 'guard_transition', args: { _org: orgId, _shift: command.shiftId, _expected: command.expected, _next: 'publicado', _reason: command.reason } };
    case 'cancel': return { name: 'guard_transition', args: { _org: orgId, _shift: command.shiftId, _expected: command.expected, _next: 'cancelado', _reason: command.reason } };
    case 'assign': return { name: 'guard_assign', args: { _org: orgId, _slot: command.slotId, _volunteer: command.volunteerId } };
    case 'confirm': return { name: 'guard_confirm', args: { _org: orgId, _assignment: command.assignmentId, _accept: command.accept, _reason: command.reason } };
  }
}

export type DutyRpcTransport = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const supabaseTransport: DutyRpcTransport = async (name, args) =>
  (await (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args));

/** Writes stay blocked while operationsEnabled is false: the gate runs before any request is issued. */
export async function executeDutyCommand(orgId: string, command: DutyCommand, transport: DutyRpcTransport = supabaseTransport): Promise<unknown> {
  if (!COMPANY_DUTY_INTEGRATION.operationsEnabled) throw new Error(COMPANY_DUTY_INTEGRATION.message);
  const contract = dutyRpcContract(orgId, command);
  const { data, error } = await transport(contract.name, contract.args);
  if (error) throw new Error(error.message);
  return data;
}

/** Converts a datetime-local value to a timezone-qualified ISO timestamp. */
export function toQualifiedTimestamp(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const d = new Date(local);
  if (!Number.isFinite(d.getTime())) return null;
  const [y, mo, da] = local.slice(0, 10).split('-').map(Number), [h, mi] = local.slice(11, 16).split(':').map(Number);
  // Reject calendar roll-overs such as 2026-02-31 or 25:00.
  if (d.getFullYear() !== y || d.getMonth() + 1 !== mo || d.getDate() !== da || d.getHours() !== h || d.getMinutes() !== mi) return null;
  return d.toISOString();
}
export interface DraftFormSlot { role: string; mode: string; start: string; end: string; capacity: number; critical?: boolean; specialties?: string[] }
export interface DraftForm { companyId: string; name: string; start: string; end: string; mode: string; slots: DraftFormSlot[] }
/** Mirrors guard_create_draft / guard_shifts / guard_slots checks. Server remains authoritative. */
export function buildDraftCommand(form: DraftForm, allowedCompanyIds: string[]): { ok: true; command: Extract<DutyCommand, { kind: 'createDraft' }> } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!allowedCompanyIds.includes(form.companyId)) errors.push('Seleccione una compañía autorizada.');
  const name = form.name.trim();
  if (name.length < 1 || name.length > 160) errors.push('El nombre debe tener entre 1 y 160 caracteres.');
  if (!['presencial', 'domiciliaria', 'mixta'].includes(form.mode)) errors.push('Modalidad inválida.');
  const start = toQualifiedTimestamp(form.start), end = toQualifiedTimestamp(form.end);
  if (!start || !end) errors.push('Indique inicio y término del turno.');
  else if (end <= start) errors.push('El término debe ser posterior al inicio.');
  if (form.slots.length < 1 || form.slots.length > 100) errors.push('Debe haber entre 1 y 100 cupos.');
  const slots: DutyDraftSlot[] = [];
  form.slots.forEach((s, i) => {
    const n = i + 1, role = s.role.trim();
    const ss = toQualifiedTimestamp(s.start), se = toQualifiedTimestamp(s.end);
    if (role.length < 1 || role.length > 100) errors.push(`Cupo ${n}: función obligatoria (máx. 100).`);
    if (s.mode !== 'presencial' && s.mode !== 'domiciliaria') errors.push(`Cupo ${n}: modalidad inválida.`);
    if (!Number.isInteger(s.capacity) || s.capacity < 1 || s.capacity > 500) errors.push(`Cupo ${n}: cantidad entre 1 y 500.`);
    if (!ss || !se) errors.push(`Cupo ${n}: indique inicio y término.`);
    else if (se <= ss) errors.push(`Cupo ${n}: el término debe ser posterior al inicio.`);
    else if (start && end && (ss < start || se > end)) errors.push(`Cupo ${n}: debe quedar dentro del horario del turno.`);
    if (form.mode !== 'mixta' && (s.mode === 'presencial' || s.mode === 'domiciliaria') && s.mode !== form.mode) errors.push(`Cupo ${n}: la modalidad debe ser ${form.mode} como el turno.`);
    if (ss && se) slots.push({ role, mode: s.mode as DutyDraftSlot['mode'], start: ss, end: se, capacity: s.capacity, critical: !!s.critical, specialties: s.specialties ?? [] });
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, command: { kind: 'createDraft', companyId: form.companyId, name, start: start!, end: end!, mode: form.mode as ShiftMode, slots } };
}

/** Mode for newly added slots: mirrors the shift unless it is mixta. */
export function defaultSlotMode(shiftMode: string): 'presencial' | 'domiciliaria' {
  return shiftMode === 'domiciliaria' ? 'domiciliaria' : 'presencial';
}
/** 1-based indexes of slots whose mode the shift does not admit (never rewritten silently). */
export function incompatibleSlotIndexes(shiftMode: string, slots: { mode: string }[]): number[] {
  if (shiftMode === 'mixta') return [];
  return slots.flatMap((s, i) => s.mode !== shiftMode ? [i + 1] : []);
}
/** guard_assignments.status CHECK values. */
export const ASSIGNMENT_STATUSES = ['propuesto', 'confirmado', 'rechazado', 'retirado', 'reemplazado'] as const;
export const SHIFT_STATUSES = ['borrador', 'publicado', 'en_curso', 'finalizado', 'cancelado'] as const;
export function dutyStatusOptions(scope: 'organization' | 'company' | 'own'): readonly string[] {
  return scope === 'own' ? ASSIGNMENT_STATUSES : SHIFT_STATUSES;
}
export function filterMyAssignmentsByStatus<T extends { assignment_status: string }>(rows: T[], status: string): T[] {
  return status === 'all' ? rows : rows.filter(r => r.assignment_status === status);
}

export interface DutyShiftRow { id: string; company_id: string; name: string; starts_at: string; ends_at: string; mode: string; status: string; capacity: number }
/** Reads guard_shifts/guard_slots; RLS (guard_supervise / guard_can manage) decides visibility. */
export async function fetchDutyShifts(orgId: string): Promise<DutyShiftRow[]> {
  const { data: shifts, error } = await supabase.from('guard_shifts').select('id,company_id,name,starts_at,ends_at,mode,status').eq('organization_id', orgId).order('starts_at', { ascending: false }).limit(200);
  if (error) throw error;
  const ids = (shifts ?? []).map(s => s.id);
  const cap = new Map<string, number>();
  if (ids.length) {
    const { data: slots, error: e2 } = await supabase.from('guard_slots').select('shift_id,capacity').eq('organization_id', orgId).in('shift_id', ids);
    if (e2) throw e2;
    (slots ?? []).forEach(s => cap.set(s.shift_id, (cap.get(s.shift_id) ?? 0) + s.capacity));
  }
  return (shifts ?? []).map(s => ({ ...s, capacity: cap.get(s.id) ?? 0 }));
}
export interface DutyMyAssignment { assignment_id: string; shift_id: string; slot_id: string; company_id: string; shift_name: string; starts_at: string; ends_at: string; mode: string; role_name: string; assignment_status: string; shift_status: string }
/** guard_my_assignments(_org) filters by auth.uid() server-side; never pass a user id. */
export async function fetchMyDutyAssignments(orgId: string): Promise<DutyMyAssignment[]> {
  const { data, error } = await supabase.rpc('guard_my_assignments', { _org: orgId });
  if (error) throw error;
  return (data ?? []) as DutyMyAssignment[];
}

export interface DutyCompany { id: string; name: string; number: number; organization_id: string }
/** Presentation scope only. Guard data and commands must still be authorized on the server. */
export function dutyCompanyScope(role: AccessRole, companyId: string | null): 'organization' | 'company' | 'own' {
  if (role === 'admin') return companyId ? 'company' : 'organization';
  return 'own';
}
export function visibleDutyCompanies(companies: DutyCompany[], orgId: string, role: AccessRole, companyId: string | null) {
  const scope = dutyCompanyScope(role, companyId);
  return companies.filter(c => c.organization_id === orgId && (scope === 'organization' || (scope === 'company' && c.id === companyId)));
}