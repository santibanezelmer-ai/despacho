// Formulario comercial único. Se guarda en la tabla de solicitudes existente
// sin cambiar su estructura: los campos sin columna propia van en el mensaje.
export interface DemoRequest {
  name: string;
  position: string;
  department: string;
  company: string;
  location: string;
  phone: string;
  email: string;
  message: string;
}

export const EMPTY_DEMO_REQUEST: DemoRequest = {
  name: '', position: '', department: '', company: '', location: '', phone: '', email: '', message: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDemoRequest(f: DemoRequest): string | null {
  if (f.name.trim().length < 2) return 'Ingresa tu nombre completo';
  if (!f.position.trim()) return 'Ingresa tu cargo institucional';
  if (!f.department.trim()) return 'Ingresa tu Cuerpo de Bomberos';
  if (!f.location.trim()) return 'Ingresa tu ciudad y región';
  if (f.phone.replace(/\D/g, '').length < 8) return 'Ingresa un teléfono o WhatsApp válido';
  if (!EMAIL_RE.test(f.email.trim()) || f.email.trim().length > 255) return 'Ingresa un correo válido';
  if (f.message.length > 1000) return 'El mensaje es demasiado largo';
  return null;
}

export function buildDemoLead(f: DemoRequest) {
  const lines = [
    `Cargo: ${f.position.trim()}`,
    `Cuerpo de Bomberos: ${f.department.trim()}`,
    f.company.trim() ? `Compañía: ${f.company.trim()}` : null,
    `Teléfono/WhatsApp: ${f.phone.trim()}`,
    f.message.trim() ? `Mensaje: ${f.message.trim()}` : null,
  ].filter(Boolean);
  return {
    email: f.email.trim(),
    name: f.name.trim(),
    city: f.location.trim(),
    message: lines.join('\n'),
    station_size: null,
    source: 'contact_form',
  };
}
