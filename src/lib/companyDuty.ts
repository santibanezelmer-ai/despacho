import type { AccessRole } from './rolePermissions';

/** Installation and real-session authorization have not been validated. Never probe with commands. */
export const COMPANY_DUTY_INTEGRATION = Object.freeze({
  operationsEnabled: false,
  message: 'Pendiente de instalar y validar Guardias. No se guardarán cambios.',
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

/** Fail closed even for non-UI callers. No transport is installed until real authorization is validated. */
export async function executeDutyCommand(_orgId: string, _command: DutyCommand): Promise<never> {
  throw new Error(COMPANY_DUTY_INTEGRATION.message);
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