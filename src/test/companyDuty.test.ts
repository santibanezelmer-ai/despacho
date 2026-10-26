import { describe, expect, it } from 'vitest';
import { dutyCompanyScope, visibleDutyCompanies, ownScopeCompanies } from '../lib/companyDuty';
const companies = [{ id: 'a', name: 'Primera', number: 1, organization_id: 'org' }, { id: 'b', name: 'Segunda', number: 2, organization_id: 'org' }, { id: 'c', name: 'Ajena', number: 1, organization_id: 'other' }];
describe('Guardias presentation scope, never server authorization', () => {
  it('company administrators consult only their own company', () => { expect(visibleDutyCompanies(companies,'org','admin','a').map(c => c.id)).toEqual(['a']); });
  it('Corps administrators supervise only their organization', () => { expect(visibleDutyCompanies(companies,'org','admin',null).map(c => c.id)).toEqual(['a','b']); });
  it('volunteers do not get a company-wide roster', () => { expect(visibleDutyCompanies(companies,'org','voluntario','a')).toEqual([]); expect(dutyCompanyScope('voluntario','a')).toBe('own'); });
  it('official role alone does not grant company-wide access', () => { expect(visibleDutyCompanies(companies,'org','oficial','a')).toEqual([]); });
  it('personal view filters list only companies present in their own assignments', () => {
    expect(ownScopeCompanies(companies, ['a', 'b', 'a']).map(c => c.id)).toEqual(['a', 'b']);
    expect(ownScopeCompanies(companies, [])).toEqual([]);
  });
});