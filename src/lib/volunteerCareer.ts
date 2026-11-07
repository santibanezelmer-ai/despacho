/** Catálogo ANB, niveles formativos y cómputo de años de servicio. */

export type Malla = 'inicial' | 'operativa' | 'profesional' | 'especialidad' | 'externo';

export const MALLA_LABEL: Record<Malla, string> = {
  inicial: 'Malla Inicial',
  operativa: 'Malla Operativa',
  profesional: 'Malla Profesional',
  especialidad: 'Especialidad',
  externo: 'Externo / Otro',
};

export interface AnbCourse { code: string; name: string; malla: Malla }

export const ANB_CATALOG: AnbCourse[] = [
  { code: 'INI-01', name: 'Inducción a la Institución', malla: 'inicial' },
  { code: 'INI-02', name: 'Fuego Básico', malla: 'inicial' },
  { code: 'INI-03', name: 'Agua para Incendios', malla: 'inicial' },
  { code: 'INI-04', name: 'Ventilación', malla: 'inicial' },
  { code: 'INI-05', name: 'EPP y ERA', malla: 'inicial' },
  { code: 'INI-06', name: 'Cuerdas y Nudos', malla: 'inicial' },
  { code: 'INI-07', name: 'Comunicaciones', malla: 'inicial' },
  { code: 'OPE-01', name: 'Búsqueda y Rescate en Incendios', malla: 'operativa' },
  { code: 'OPE-02', name: 'Entrada Forzada', malla: 'operativa' },
  { code: 'OPE-03', name: 'Ventilación Táctica', malla: 'operativa' },
  { code: 'OPE-04', name: 'Escalas', malla: 'operativa' },
  { code: 'OPE-05', name: 'Soporte Vital Básico (SVB)', malla: 'operativa' },
  { code: 'OPE-06', name: 'Sistema de Comando de Incidentes (SCI)', malla: 'operativa' },
  { code: 'PRO-01', name: 'Tácticas Estructurales', malla: 'profesional' },
  { code: 'PRO-02', name: 'RIT/RIC (Rescate de Bomberos)', malla: 'profesional' },
  { code: 'PRO-03', name: 'Control de Incendios en Altura', malla: 'profesional' },
  { code: 'PRO-04', name: 'Liderazgo Operativo', malla: 'profesional' },
  { code: 'ESP-01', name: 'Rescate Vehicular', malla: 'especialidad' },
  { code: 'ESP-02', name: 'USAR', malla: 'especialidad' },
  { code: 'ESP-03', name: 'Rescate en Aguas Rápidas', malla: 'especialidad' },
  { code: 'ESP-04', name: 'HazMat PRIMAP', malla: 'especialidad' },
  { code: 'ESP-05', name: 'HazMat Operaciones', malla: 'especialidad' },
  { code: 'ESP-06', name: 'Conducción / Operador de Bombas (COB)', malla: 'especialidad' },
  { code: 'ESP-07', name: 'Combate de Incendios Forestales', malla: 'especialidad' },
];

export interface MallaProgress { malla: Malla; done: number; total: number; pct: number }

/** Progreso por malla obligatoria y nivel ANB alcanzado (malla completa). */
export function anbProgress(training: { anb_course_code?: string | null }[]) {
  const codes = new Set(training.map(t => t.anb_course_code).filter(Boolean) as string[]);
  const mallas: Malla[] = ['inicial', 'operativa', 'profesional'];
  const progress: MallaProgress[] = mallas.map(m => {
    const list = ANB_CATALOG.filter(c => c.malla === m);
    const done = list.filter(c => codes.has(c.code)).length;
    return { malla: m, done, total: list.length, pct: Math.round((done / list.length) * 100) };
  });
  let level = 'En formación';
  for (const p of progress) {
    if (p.done === p.total) level = { inicial: 'Inicial', operativa: 'Operativo', profesional: 'Profesional' }[p.malla as 'inicial'];
    else break;
  }
  const specialties = ANB_CATALOG.filter(c => c.malla === 'especialidad' && codes.has(c.code)).map(c => c.name);
  return { progress, level, specialties };
}

export const HONOR_YEARS = { company: 10, body: 20, insigne: 50 };

export interface ServiceTime {
  years: number; months: number; days: number; label: string;
  honor: string; nextQuinquennium: number; nextDate: Date; daysToNext: number;
}

/** Años, meses y días exactos desde la fecha de ingreso, jerarquía honoraria y próximo quinquenio. */
export function serviceTime(joinDate?: string | null, now = new Date()): ServiceTime | null {
  if (!joinDate) return null;
  const [y, m, d] = joinDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (start > today) return null;
  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  let days = today.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) { years -= 1; months += 12; }
  const honor = years >= HONOR_YEARS.insigne ? 'Voluntario Insigne de Bomberos de Chile'
    : years >= HONOR_YEARS.body ? 'Honorario de Cuerpo'
    : years >= HONOR_YEARS.company ? 'Honorario de Compañía'
    : 'Voluntario Activo';
  const nextQuinquennium = (Math.floor(years / 5) + 1) * 5;
  const nextDate = new Date(start.getFullYear() + nextQuinquennium, start.getMonth(), start.getDate());
  const daysToNext = Math.round((nextDate.getTime() - today.getTime()) / 86400000);
  const p = (n: number, s: string, pl: string) => `${n} ${n === 1 ? s : pl}`;
  const label = `${p(years, 'año', 'años')}, ${p(months, 'mes', 'meses')} y ${p(days, 'día', 'días')}`;
  return { years, months, days, label, honor, nextQuinquennium, nextDate, daysToNext };
}
