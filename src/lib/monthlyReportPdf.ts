import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MonthlyReport } from '../../supabase/functions/_shared/report-data';
import { formatMetric, roleLabels } from '../../supabase/functions/_shared/report-template';
import { variation } from '../../supabase/functions/_shared/monthly-report';
export async function downloadMonthlyReportPdf(r: MonthlyReport) {
  const logo = await import('@/assets/operix-logo.png');
  const image = new Image();
  image.src = logo.default;
  await image.decode();
  const doc = createMonthlyReportPdf(r, image);
  doc.save(`operix-reporte-${r.period}.pdf`);
}
// Document-specific semantic palette: PDF has no DOM or CSS-variable support.
const palette = { ink: '#14283F', accent: '#CF3039', paper: '#FFFFFF', muted: '#586779', line: '#DCE2E9', canvas: '#F1F4F7', warning: '#FBEDEF' };
export function createMonthlyReportPdf(r: MonthlyReport, logo?: HTMLImageElement) {
  const doc = new jsPDF();
  const m = r.current;
  const periodName = (period: string) => new Date(`${period}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
  const period = periodName(r.period);
  let y = 60;
  const text = (value: string, x: number, top: number, size = 9, color = palette.ink, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color); doc.text(value, x, top);
  };
  const header = (subtitle: string) => {
    doc.setFillColor(palette.ink); doc.rect(0, 0, 210, 47, 'F');
    doc.setFillColor(palette.accent); doc.rect(0, 47, 210, 1.5, 'F');
    if (logo) doc.addImage(logo, 'PNG', 14, 9, 25, 25);
    const x = logo ? 45 : 14;
    text('OPERIX DISPATCH', x, 15, 14, palette.paper, true);
    text('INFORME EJECUTIVO MENSUAL', x, 23, 9, palette.paper);
    text(doc.splitTextToSize(r.organizationName, 150).join('\n'), x, 31, 10, palette.paper, true);
    text(`${period}  /  ${subtitle}`, 14, 43, 8, palette.paper);
  };
  const next = () => { doc.addPage(); header('Continuación'); y = 60; };
  const ensure = (height: number) => { if (y + height > 274) next(); };
  const section = (number: string, title: string) => {
    ensure(18); text(number, 14, y, 10, palette.accent, true); text(title, 24, y, 12, palette.ink, true); y += 7;
  };
  const note = (value: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const lines: string[] = doc.splitTextToSize(value, 182);
    ensure(lines.length * 3.7 + 3);
    text(lines.join('\n'), 14, y, 8, palette.muted); y += lines.length * 3.7 + 3;
  };
  const table = (head: string[], body: string[][]) => {
    ensure(20);
    autoTable(doc, { startY: y, head: [head], body: body.length ? body : [head.map(() => 'S/D')], theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.7, textColor: palette.ink, lineColor: palette.line, lineWidth: { bottom: 0.2 } },
      headStyles: { fillColor: palette.ink, textColor: palette.paper, fontStyle: 'bold' }, alternateRowStyles: { fillColor: palette.canvas },
      margin: { left: 14, right: 14, top: 60, bottom: 25 }, rowPageBreak: 'avoid',
      willDrawPage: () => { if (doc.getCurrentPageInfo().pageNumber > 2) header('Continuación'); },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 5;
  };
  const bars = (entries: [string, number][], labels: Record<string, string>, fallback: string, x = 14, width = 182, start = y) => {
    let top = start;
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...sorted.map(([, n]) => n));
    if (!sorted.length) { text('S/D · Sin registros suficientes', x, top, 8, palette.muted); return top + 10; }
    for (const [id, count] of sorted) {
      if (top + 15 > 274) { next(); top = y; }
      doc.setFontSize(8); const lines: string[] = doc.splitTextToSize(labels[id] ?? fallback, width - 14);
      text(lines.join('\n'), x, top, 8);
      doc.setFont('helvetica', 'bold'); doc.text(String(count), x + width, top, { align: 'right' });
      top += lines.length * 3.5;
      doc.setFillColor(palette.canvas); doc.rect(x, top, width, 3.5, 'F');
      doc.setFillColor(palette.accent); doc.rect(x, top, width * count / max, 3.5, 'F'); top += 7.5;
    }
    return top;
  };
  header('Operación y respuesta');
  section('01', 'Resumen ejecutivo');
  const services = Object.values(m.fleet).reduce((total, f) => total + f.services, 0);
  const cards = [['Despachos', formatMetric(m.total)], ['Servicios de móviles', formatMetric(services)], ['Respuesta promedio 6-3', formatMetric(m.responseMinutes, ' min')], ['Asistencias registradas', m.assistances ? formatMetric(m.assistances) : 'S/D']];
  cards.forEach(([label, value], i) => {
    const x = 14 + i * 46.5;
    doc.setFillColor(palette.canvas); doc.roundedRect(x, y, 42.5, 28, 1.5, 1.5, 'F');
    doc.setFillColor(palette.accent); doc.rect(x, y, 42.5, 1, 'F');
    text(label, x + 3, y + 7, 7, palette.muted); text(value, x + 3, y + 20, 19, palette.ink, true);
  });
  y += 32;
  note(`${m.closed} emergencias cerradas. Un despacho corresponde a una emergencia; los servicios de móviles cuentan cada participación de una unidad. Una emergencia puede movilizar varias unidades.`);
  section('02', 'Tiempos de respuesta · primer 6-3');
  table(['Promedio (min)', 'Mínimo (min)', 'Máximo (min)', 'Emergencias con 6-3'], [[formatMetric(m.responseMinutes, ' min'), formatMetric(m.responseMin, ' min'), formatMetric(m.responseMax, ' min'), `${m.responseSamples} / ${m.total}`]]);
  doc.setFillColor(palette.warning); doc.rect(14, y, 182, 18, 'F');
  text(formatMetric(m.missingArrivalPercent, '%'), 18, y + 12, 18, palette.accent, true);
  text('Emergencias sin registro 6-3 válido', 57, y + 8, 10, palette.ink, true);
  text(`${m.total - m.responseSamples} de ${m.total} despachos sin llegada válida registrada`, 57, y + 14, 8, palette.muted);
  y += 25;
  note('Intervalo desde el despacho hasta la primera llegada válida de un móvil. No equivale al tiempo total en servicio ni al retorno 6-10. La falta de registro no acredita ausencia de llegada.');
  section('03', 'Distribución de emergencias');
  y = bars(Object.entries(m.byKey), r.keys, 'Sin clave registrada');
  note('Barras proporcionales a la clave de mayor frecuencia; cifras expresadas en despachos.');
  next();
  section('04', 'Actividad de flota · retorno 6-10');
  table(['Móvil', 'Servicios', 'Km registrados', 'Promedio servicio (min)'], Object.entries(m.fleet).sort((a,b) => b[1].services-a[1].services).map(([id,f]) => [r.vehicles[id] ?? 'Sin identificación', String(f.services), `${formatMetric(f.kilometers, ' km')} · ${f.kilometerSamples}/${f.services}`, `${formatMetric(f.serviceMinutes, ' min')} · ${f.serviceSamples}/${f.services}`]));
  note(`Cobertura: muestras válidas / servicios por móvil. Odómetros: ${m.kilometerSamples}/${services} servicios; kilómetros acumulados: ${formatMetric(m.kilometers, ' km')}. Solo pares de odómetros válidos. Tiempo promedio: desde asignación hasta retorno registrado en cuartel (6-10); excluye reasignaciones y cierres sin retorno. S/D indica falta de muestras válidas.`);
  section('05', 'Personal · asistencias registradas');
  const leftEntries = Object.entries(m.byCompany), rightEntries = Object.entries(m.byRole);
  // Use two columns only when both charts fit; large organizations flow without truncation.
  const chartHeight = (entries: [string, number][], labels: Record<string,string>, fallback: string) => entries.reduce((height, [id]) => {
    doc.setFontSize(8); return height + doc.splitTextToSize(labels[id] ?? fallback, 72).length * 3.5 + 7.5;
  }, 0);
  const height = Math.max(chartHeight(leftEntries, r.companies, 'Sin compañía registrada'), chartHeight(rightEntries, roleLabels, 'Otra función')) + 10;
  if (height < 95) {
    ensure(height + 8); text('POR COMPAÑÍA', 14, y, 8, palette.muted, true); text('POR FUNCIÓN', 112, y, 8, palette.muted, true); y += 7;
    const left = bars(leftEntries, r.companies, 'Sin compañía registrada', 14, 84, y);
    const right = bars(rightEntries, roleLabels, 'Otra función', 112, 84, y); y = Math.max(left, right) + 2;
  } else {
    note('Por compañía'); y = bars(leftEntries, r.companies, 'Sin compañía registrada');
    note('Por función'); y = bars(rightEntries, roleLabels, 'Otra función');
  }
  note('Cuenta asistencias registradas, no voluntarios únicos. Una persona puede registrar varias participaciones. Compañía según ficha actual, sin fotografía histórica. No incluye datos personales.');
  section('06', `Comparativa · ${periodName(r.priorPeriod)}`);
  const comparisons: [string, number|null, number|null, string][] = [['Despachos',m.total,r.prior.total,''], ['Kilómetros',m.kilometers,r.prior.kilometers,' km'], ['Respuesta 6-3',m.responseMinutes,r.prior.responseMinutes,' min'], ['Asistencias registradas',m.assistances || null,r.prior.assistances || null,'']];
  table(['Indicador', r.priorPeriod, r.period, 'Variación absoluta', 'Variación %'], comparisons.map(([label,a,b,unit]) => { const v=variation(a,b); return [label,formatMetric(b,unit),formatMetric(a,unit),formatMetric(v.absolute,unit),formatMetric(v.percent,'%')]; }));
  note(r.prior.total === 0 ? `${periodName(r.priorPeriod)} no tiene despachos registrados en este sistema. La variación porcentual de despachos es S/D porque la base es cero; no se puede dividir por cero. Otros indicadores muestran S/D si faltan muestras. No implica que no existieran servicios fuera del sistema.` : 'S/D: indicador sin muestras suficientes o base anterior igual a cero. Variación absoluta = mes actual menos anterior. Los cambios en tiempos no constituyen una evaluación de desempeño.');
  const generated = new Date(r.generatedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' });
  for (let i=1; i<=doc.getNumberOfPages(); i++) {
    doc.setPage(i); doc.setDrawColor(palette.line); doc.line(14, 280, 196, 280);
    text(`Período ${r.period} · Generado ${generated} (Chile)`, 14, 286, 7, palette.muted);
    text('OPERIX DISPATCH · Uso institucional reservado', 14, 291, 7, palette.muted);
    doc.text(`Página ${i} de ${doc.getNumberOfPages()}`, 196, 291, { align: 'right' });
  }
  doc.setProperties({title:`Operix Dispatch · Reporte ${r.period}`,author:'Operix Dispatch',subject:r.organizationName});
  return doc;
}
