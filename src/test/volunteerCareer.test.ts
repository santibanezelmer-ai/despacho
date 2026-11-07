import { describe, it, expect } from 'vitest';
import { serviceTime, anbProgress, ANB_CATALOG } from '@/lib/volunteerCareer';

describe('serviceTime', () => {
  const now = new Date(2026, 10, 7);
  it('computes exact years, months, days', () => {
    const s = serviceTime('2016-09-05', now)!;
    expect([s.years, s.months, s.days]).toEqual([10, 2, 2]);
  });
  it('honorario de compañía at 10 years, cuerpo at 20, insigne at 50', () => {
    expect(serviceTime('2016-11-07', now)!.honor).toBe('Honorario de Compañía');
    expect(serviceTime('2016-11-08', now)!.honor).toBe('Voluntario Activo');
    expect(serviceTime('2006-01-01', now)!.honor).toBe('Honorario de Cuerpo');
    expect(serviceTime('1976-01-01', now)!.honor).toBe('Voluntario Insigne de Bomberos de Chile');
  });
  it('next quinquennium', () => {
    const s = serviceTime('2014-03-01', now)!;
    expect(s.nextQuinquennium).toBe(15);
    expect(s.nextDate.getFullYear()).toBe(2029);
  });
});

describe('anbProgress', () => {
  it('level Inicial only when whole initial malla is done', () => {
    const ini = ANB_CATALOG.filter(c => c.malla === 'inicial').map(c => ({ anb_course_code: c.code }));
    expect(anbProgress(ini.slice(1)).level).toBe('En formación');
    expect(anbProgress(ini).level).toBe('Inicial');
  });
});
