// Formulario comercial único. Se guarda en la tabla de solicitudes existente
// sin cambiar su estructura: los campos sin columna propia van en el mensaje,
// en un orden fijo y legible.
export interface DemoRequest {
  name: string;
  position: string;
  department: string;
  company: string;
  location: string;
  phone: string;
  email: string;
  message: string;
  consent: boolean;
}

export const EMPTY_DEMO_REQUEST: DemoRequest = {
  name: '', position: '', department: '', company: '', location: '', phone: '', email: '', message: '', consent: false,
};

export const PRIVACY_POLICY_PATH = '/privacidad';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateDemoRequest(f: DemoRequest): string | null {
  if (f.name.trim().length < 2) return 'Ingresa tu nombre completo';
  if (!f.position.trim()) return 'Ingresa tu cargo institucional';
  if (!f.department.trim()) return 'Ingresa tu Cuerpo de Bomberos';
  if (!f.location.trim()) return 'Ingresa tu ciudad y región';
  if (f.phone.replace(/\D/g, '').length < 8) return 'Ingresa un teléfono o WhatsApp válido';
  if (!EMAIL_RE.test(f.email.trim()) || f.email.trim().length > 254) return 'Ingresa un correo válido';
  if (f.message.length > 1000) return 'El mensaje es demasiado largo';
  if (!f.consent) return 'Debes aceptar el tratamiento de tus datos personales';
  return null;
}

export function buildDemoLead(f: DemoRequest, now: Date = new Date()) {
  const lines = [
    `Cargo: ${f.position.trim()}`,
    `Cuerpo de Bomberos: ${f.department.trim()}`,
    `Compañía: ${f.company.trim() || '—'}`,
    `Ciudad y región: ${f.location.trim()}`,
    `Teléfono/WhatsApp: ${f.phone.trim()}`,
    `Consentimiento datos personales: aceptado ${now.toISOString()} (${PRIVACY_POLICY_PATH})`,
    `Mensaje: ${f.message.trim() || '—'}`,
  ];
  return {
    email: f.email.trim(),
    name: f.name.trim(),
    city: f.location.trim(),
    message: lines.join('\n'),
    station_size: null,
    source: 'contact_form',
  };
}
