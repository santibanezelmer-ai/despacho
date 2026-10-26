import { describe, expect, it, vi } from 'vitest';
import { COMPANY_DUTY_INTEGRATION, dutyRpcContract, executeDutyCommand, type DutyCommand } from '../lib/companyDuty';

const commands: DutyCommand[] = [
  { kind: 'createShift', companyId: 'company-a', name: 'Noche', start: '2026-10-26T00:00:00Z', end: '2026-10-26T08:00:00Z', mode: 'mixta' },
  { kind: 'createSlot', shiftId: 'shift-a', role: 'Conductor', mode: 'presencial', start: '2026-10-26T00:00:00Z', end: '2026-10-26T08:00:00Z', capacity: 2, critical: true, specialties: ['conductor'] },
  { kind: 'publish', shiftId: 'shift-a', expected: 'borrador', reason: '' },
  { kind: 'cancel', shiftId: 'shift-a', expected: 'publicado', reason: 'Cambio de planificación' },
  { kind: 'assign', slotId: 'slot-a', volunteerId: 'volunteer-a' },
  { kind: 'confirm', assignmentId: 'assignment-a', accept: true, reason: '' },
];

describe('Guardias v3 integration without installation', () => {
  it.each(commands.slice(0, 2))('never dispatches $kind alone (drafts must be atomic)', async command => {
    const t = vi.fn();
    await expect(executeDutyCommand('org-a', command, t)).rejects.toThrow();
    expect(t).not.toHaveBeenCalled();
  });
  it.each(commands.slice(2))('dispatches $kind as exactly one server RPC', async command => {
    expect(COMPANY_DUTY_INTEGRATION.operationsEnabled).toBe(true);
    const t = vi.fn().mockResolvedValue({ data: null, error: null });
    await executeDutyCommand('org-a', command, t);
    expect(t).toHaveBeenCalledTimes(1);
    expect(t).toHaveBeenCalledWith(dutyRpcContract('org-a', command).name, dutyRpcContract('org-a', command).args);
  });
  it('maps server denial to a clear message', async () => {
    const t = vi.fn().mockResolvedValue({ data: null, error: { message: 'company management denied' } });
    await expect(executeDutyCommand('org-a', commands[2], t)).rejects.toThrow('No tiene delegación de gestión');
  });
  it('maps issuer and delegation contracts without client actor', () => {
    expect(dutyRpcContract('org-a', { kind: 'setIssuer', targetUserId: 'u', grant: true, reason: 'Designación' })).toEqual({ name: 'guard_set_issuer', args: { _org: 'org-a', _target: 'u', _grant: true, _reason: 'Designación' } });
    expect(dutyRpcContract('org-a', { kind: 'setPermission', companyId: 'c', targetUserId: 'u', action: 'manage', grant: false, reason: 'Fin' })).toEqual({ name: 'guard_set_permission', args: { _org: 'org-a', _company: 'c', _target: 'u', _action: 'manage', _grant: false, _reason: 'Fin' } });
  });
  it('maps the existing scalar UUID creation contract with organization and company scope', () => {
    expect(dutyRpcContract('org-a', commands[0])).toEqual({ name: 'guard_create_shift', args: { _org: 'org-a', _company: 'company-a', _name: 'Noche', _start: '2026-10-26T00:00:00Z', _end: '2026-10-26T08:00:00Z', _mode: 'mixta' } });
  });
  it('maps slot creation without inventing missing SQL arguments', () => {
    expect(dutyRpcContract('org-a', commands[1])).toEqual({ name: 'guard_create_slot', args: { _org: 'org-a', _shift: 'shift-a', _role: 'Conductor', _mode: 'presencial', _start: '2026-10-26T00:00:00Z', _end: '2026-10-26T08:00:00Z', _capacity: 2, _critical: true, _specialties: ['conductor'] } });
  });
  it('publishes through the existing expected-state transition contract', () => {
    expect(dutyRpcContract('org-a', commands[2])).toEqual({ name: 'guard_transition', args: { _org: 'org-a', _shift: 'shift-a', _expected: 'borrador', _next: 'publicado', _reason: '' } });
  });
  it('cancels through the same contract preserving the reason and expected state', () => {
    expect(dutyRpcContract('org-a', commands[3])).toEqual({ name: 'guard_transition', args: { _org: 'org-a', _shift: 'shift-a', _expected: 'publicado', _next: 'cancelado', _reason: 'Cambio de planificación' } });
  });
  it('assigns using the volunteer record, not a client-supplied actor', () => {
    expect(dutyRpcContract('org-a', commands[4])).toEqual({ name: 'guard_assign', args: { _org: 'org-a', _slot: 'slot-a', _volunteer: 'volunteer-a' } });
  });
  it('confirms the assignment without supplying an actor or permission', () => {
    expect(dutyRpcContract('org-a', commands[5])).toEqual({ name: 'guard_confirm', args: { _org: 'org-a', _assignment: 'assignment-a', _accept: true, _reason: '' } });
  });
});