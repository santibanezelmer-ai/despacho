import { describe, it, expect } from 'vitest';
import { buildDemoLead, validateDemoRequest, EMPTY_DEMO_REQUEST } from '@/components/landing/demoRequest';
import { OPERIX_MODULES } from '@/components/landing/ModulesSection';

const valid = {
  ...EMPTY_DEMO_REQUEST,
  name: 'Ana Pérez', position: 'Secretaria', department: 'Cuerpo de Bomberos X',
  location: 'Osorno, Los Lagos', phone: '+56 9 1234 5678', email: 'ana@ejemplo.cl',
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
  it('guarda en la estructura existente de solicitudes', () => {
    const lead = buildDemoLead({ ...valid, company: 'Primera' });
    expect(Object.keys(lead).sort()).toEqual(['city', 'email', 'message', 'name', 'source', 'station_size']);
    expect(lead.source).toBe('contact_form');
    expect(lead.message).toContain('Compañía: Primera');
    expect(lead.message).toContain('Teléfono/WhatsApp: +56 9 1234 5678');
  });
});

describe('módulos oficiales', () => {
  it('son exactamente los 5 definidos', () => {
    expect(OPERIX_MODULES.map((m) => m.name)).toEqual([
      'Operix Central', 'Operix Móvil', 'Operix Voluntario', 'Operix Pantalla Central', 'Operix Gestión',
    ]);
  });
});
