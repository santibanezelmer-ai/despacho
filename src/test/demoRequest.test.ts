import { describe, it, expect } from 'vitest';
import { buildDemoLead, validateDemoRequest, EMPTY_DEMO_REQUEST } from '@/components/landing/demoRequest';
import { OPERIX_MODULES } from '@/components/landing/ModulesSection';

const valid = {
  ...EMPTY_DEMO_REQUEST,
  name: 'Ana Pérez', position: 'Secretaria', department: 'Cuerpo de Bomberos X',
  location: 'Osorno, Los Lagos', phone: '+56 9 1234 5678', email: 'ana@ejemplo.cl', consent: true,
};

describe('formulario comercial', () => {
  it('compañía y mensaje son opcionales', () => {
    expect(validateDemoRequest(valid)).toBeNull();
  });
  it('exige teléfono/WhatsApp', () => {
    expect(validateDemoRequest({ ...valid, phone: '' })).toMatch(/teléfono/i);
  });
  it('exige cargo institucional', () => {
    expect(validateDemoRequest({ ...valid, position: ' ' })).toMatch(/cargo/i);
  });
  it('exige aceptar el tratamiento de datos personales', () => {
    expect(validateDemoRequest({ ...valid, consent: false })).toMatch(/datos personales/i);
  });
  it('guarda todos los campos ordenados y el consentimiento con fecha', () => {
    const lead = buildDemoLead({ ...valid, company: 'Primera', message: 'Hola' }, new Date('2026-11-07T15:00:00Z'));
    expect(Object.keys(lead).sort()).toEqual(['city', 'email', 'message', 'name', 'source', 'station_size']);
    expect(lead.source).toBe('contact_form');
    expect(lead.message.split('\n')).toEqual([
      'Cargo: Secretaria',
      'Cuerpo de Bomberos: Cuerpo de Bomberos X',
      'Compañía: Primera',
      'Ciudad y región: Osorno, Los Lagos',
      'Teléfono/WhatsApp: +56 9 1234 5678',
      'Consentimiento datos personales: aceptado 2026-11-07T15:00:00.000Z (/privacidad)',
      'Mensaje: Hola',
    ]);
  });
  it('el mensaje cabe en el límite de la tabla con todos los campos al máximo', () => {
    const long = (n: number) => 'x'.repeat(n);
    const lead = buildDemoLead({ ...valid, position: long(100), department: long(120), company: long(100), location: long(120), phone: long(30), message: long(1000) });
    expect(lead.message.length).toBeLessThanOrEqual(2000);
  });
});

describe('módulos oficiales', () => {
  it('son exactamente los 5 definidos', () => {
    expect(OPERIX_MODULES.map((m) => m.name)).toEqual([
      'Operix Central', 'Operix Móvil', 'Operix Voluntario', 'Operix Pantalla Central', 'Operix Gestión',
    ]);
  });
});
