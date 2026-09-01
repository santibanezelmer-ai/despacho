import jsPDF from 'jspdf';
import { seniority } from '@/hooks/useVolunteerProfile';

const CONDITION_LABEL: Record<string, string> = {
  bueno: 'Bueno', regular: 'Regular', malo: 'Malo', fuera_servicio: 'Fuera de servicio',
};

const RECORD_LABEL: Record<string, string> = {
  merito: 'Mérito', demerito: 'Demérito', observacion: 'Observación',
  licencia: 'Licencia', sancion: 'Sanción',
};

const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('es-CL') : '—');
const dt = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

export interface VolunteerPdfInput {
  volunteer: any;
  training: any[];
  equipment: any[];
  attendance: any[];
  records: any[];
  orgName: string;
}

/** Ficha imprimible del voluntario con todos los módulos (datos, especialidades,
 *  capacitaciones, equipamiento, asistencia operacional y hoja de vida). */
export function buildVolunteerPdf({
  volunteer, training, equipment, attendance, records, orgName,
}: VolunteerPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12;
  const contentW = pageW - M * 2;
  let y = M;

  const ensure = (need: number) => {
    if (y + need > pageH - 12) {
      doc.addPage();
      y = M;
    }
  };

  // ---- Encabezado
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(M, y, contentW, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(doc.splitTextToSize(orgName.toUpperCase(), contentW - 60)[0], M + 3, y + 7);
  doc.setFontSize(10);
  doc.text('FICHA DE VOLUNTARIO', M + 3, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emitida: ${dt(new Date().toISOString())}`, pageW - M - 3, y + 13.5, { align: 'right' });
  y += 18;

  // ---- Identificación
  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, contentW, 9, 'F');
  doc.rect(M, y, contentW, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${volunteer.code ? `[${volunteer.code}] ` : ''}${volunteer.name ?? ''}`, M + 3, y + 6);
  y += 9;

  const fields: [string, string][] = [
    ['RUT', volunteer.rut || '—'],
    ['Teléfono', volunteer.phone || '—'],
    ['Email', volunteer.email || '—'],
    ['Compañía', volunteer.companies?.name || '—'],
    ['Cargo / Jerarquía', volunteer.ranks?.name || '—'],
    ['Estado', volunteer.status || '—'],
    ['Fecha de ingreso', d(volunteer.join_date)],
    ['Antigüedad', seniority(volunteer.join_date) ?? '—'],
    ['Disponible', volunteer.available ? 'Sí' : 'No'],
  ];
  const colW = contentW / 3;
  const rowH = 11;
  fields.forEach((f, i) => {
    const col = i % 3;
    if (col === 0) ensure(rowH);
    const x = M + col * colW;
    doc.rect(x, y, colW, rowH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(f[0].toUpperCase(), x + 2, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(f[1], colW - 4)[0] ?? '—', x + 2, y + 8.6);
    if (col === 2 || i === fields.length - 1) y += rowH;
  });

  // ---- Especialidades
  const specs: string[] = volunteer.specialties ?? [];
  ensure(14);
  doc.rect(M, y, contentW, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ESPECIALIDADES', M + 2, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    doc.splitTextToSize(specs.length ? specs.join(' · ') : 'Sin especialidades registradas', contentW - 4)[0],
    M + 2, y + 8.6,
  );
  y += 11;

  // ---- Resumen
  ensure(16);
  const stats: [string, string][] = [
    ['Emergencias asistidas', String(attendance.length)],
    ['Capacitaciones', String(training.length)],
    ['Equipos a cargo', String(equipment.length)],
    ['Hoja de vida', String(records.length)],
  ];
  const sw = contentW / 4;
  stats.forEach((s, i) => {
    const x = M + i * sw;
    doc.rect(x, y, sw, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(s[0].toUpperCase(), x + 2, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(s[1], x + 2, y + 10);
  });
  y += 16;

  const section = (title: string) => {
    ensure(20);
    doc.setFillColor(220, 220, 220);
    doc.rect(M, y, contentW, 7, 'F');
    doc.rect(M, y, contentW, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), M + 2, y + 5);
    y += 7;
  };

  const table = (headers: string[], widths: number[], rows: string[][], empty: string) => {
    ensure(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    let x = M;
    headers.forEach((h, i) => {
      doc.rect(x, y, widths[i], 6);
      doc.text(h.toUpperCase(), x + 1.5, y + 4);
      x += widths[i];
    });
    y += 6;

    if (rows.length === 0) {
      doc.rect(M, y, contentW, 7);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(empty, M + 2, y + 4.8);
      y += 12;
      return;
    }

    rows.forEach(row => {
      // La medición debe hacerse con la misma tipografía usada al dibujar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = row.map((c, i) => doc.splitTextToSize(c || '—', widths[i] - 3));
      const h = Math.max(6, Math.max(...lines.map(l => l.length)) * 3.7 + 2.8);
      ensure(h);
      let cx = M;
      lines.forEach((l, i) => {
        doc.rect(cx, y, widths[i], h);
        doc.text(l, cx + 1.5, y + 4);
        cx += widths[i];
      });
      y += h;
    });
    y += 5;
  };

  section('Capacitaciones');
  table(
    ['Curso', 'Certificación', 'Completado', 'Vence'],
    [contentW * 0.4, contentW * 0.28, contentW * 0.16, contentW * 0.16],
    training.map(t => [t.course_name ?? '—', t.certification ?? '—', d(t.date_completed), d(t.expiry_date)]),
    'Sin capacitaciones registradas.',
  );

  section('Equipamiento a cargo');
  table(
    ['Equipo', 'Cant.', 'Estado', 'Móvil', 'Asignado'],
    [contentW * 0.36, contentW * 0.1, contentW * 0.18, contentW * 0.18, contentW * 0.18],
    equipment.map(e => [
      e.name ?? '—',
      String(e.quantity ?? '—'),
      CONDITION_LABEL[e.condition ?? ''] ?? e.condition ?? '—',
      e.vehicles?.code ?? '—',
      d(e.assigned_at),
    ]),
    'Sin equipamiento a cargo.',
  );

  section('Asistencia operacional');
  table(
    ['Folio', 'Clave', 'Dirección', 'Móvil', 'Rol', 'Fecha'],
    [contentW * 0.16, contentW * 0.1, contentW * 0.3, contentW * 0.12, contentW * 0.14, contentW * 0.18],
    attendance.map(a => [
      a.emergencies?.folio ?? '—',
      a.emergencies?.emergency_keys?.code ?? '—',
      a.emergencies?.address ?? '—',
      a.emergency_vehicles?.vehicles?.code ?? '—',
      a.role ?? '—',
      dt(a.assigned_at),
    ]),
    'Sin participación registrada.',
  );

  section('Hoja de vida');
  table(
    ['Fecha', 'Tipo', 'Título', 'Detalle'],
    [contentW * 0.14, contentW * 0.16, contentW * 0.3, contentW * 0.4],
    records.map(r => [
      d(r.record_date),
      RECORD_LABEL[r.record_type ?? ''] ?? r.record_type ?? '—',
      r.title ?? '—',
      r.description ?? '—',
    ]),
    'Sin registros en la hoja de vida.',
  );

  // ---- Firmas
  ensure(24);
  const halfW = contentW / 2 - 4;
  doc.setLineWidth(0.3);
  doc.line(M, y + 14, M + halfW, y + 14);
  doc.line(M + halfW + 8, y + 14, M + contentW, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Firma del voluntario', M, y + 18);
  doc.text('Firma y timbre del oficial', M + halfW + 8, y + 18);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${orgName} · Ficha de voluntario · Documento interno`, M, pageH - 6);
    doc.text(`Página ${p} de ${pages}`, pageW - M, pageH - 6, { align: 'right' });
  }

  return doc;
}

export function volunteerPdfFileName(name?: string | null) {
  const slug = String(name ?? 'voluntario')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
  return `ficha-voluntario-${slug}.pdf`;
}
