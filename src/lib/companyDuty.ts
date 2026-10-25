import type { AccessRole } from './rolePermissions';

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