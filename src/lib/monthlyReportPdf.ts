import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MonthlyReport } from '../../supabase/functions/_shared/report-data';
import { formatMetric, roleLabels } from '../../supabase/functions/_shared/report-template';
import { variation } from '../../supabase/functions/_shared/monthly-report';
export function downloadMonthlyReportPdf(r: MonthlyReport) {
  const doc = createMonthlyReportPdf(r);
  doc.save(`operix-reporte-${r.period}.pdf`);
}
export function createMonthlyReportPdf(r: MonthlyReport) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(18); doc.text('OPERIX DISPATCH', 14, y); y += 10;
  doc.setFontSize(11); doc.text(doc.splitTextToSize(`${r.organizationName} · Reporte mensual ${r.period}`, 180), 14, y); y += 16;
  const table = (title: string, head: string[], body: string[][]) => {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFontSize(12); doc.text(title, 14, y); y += 4;
    autoTable(doc, { startY: y, head: [head], body: body.length ? body : [['S/D']], styles: { fontSize: 9 }, margin: { left: 14, right: 14 } });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 13;
  };
  const m = r.current;
  table('Resumen ejecutivo', ['Indicador', 'Valor'], [['Despachos', String(m.total)], ['Cerradas', String(m.closed)], ['Km registrados', formatMetric(m.kilometers)], ['Asistencias registradas', m.assistances ? String(m.assistances) : 'S/D']]);
  table('Respuesta despacho a primer 6-3', ['Promedio', 'Mínimo', 'Máximo', 'Registros', 'Sin llegada válida'], [[formatMetric(m.responseMinutes), formatMetric(m.responseMin), formatMetric(m.responseMax), `${m.responseSamples}/${m.total}`, formatMetric(m.missingArrivalPercent, '%')]]);
  table('Tipos de emergencia', ['Clave', 'Cantidad'], Object.entries(m.byKey).map(([id,n]) => [r.keys[id] ?? 'Sin clave', String(n)]));
  table('Flota: servicio hasta 6-10', ['Móvil', 'Servicios', 'Km (cobertura)', 'Min servicio (cobertura)'], Object.entries(m.fleet).map(([id,f]) => [r.vehicles[id] ?? 'Sin identificación', String(f.services), `${formatMetric(f.kilometers)} (${f.kilometerSamples}/${f.services})`, `${formatMetric(f.serviceMinutes)} (${f.serviceSamples}/${f.services})`]));
  table('Asistencias registradas por compañía', ['Compañía', 'Asistencias'], Object.entries(m.byCompany).map(([id,n]) => [r.companies[id] ?? 'Sin compañía registrada', String(n)]));
  table('Funciones operativas', ['Función', 'Participaciones'], Object.entries(m.byRole).map(([id,n]) => [roleLabels[id] ?? 'Otra función', String(n)]));
  table(`Comparación con ${r.priorPeriod}`, ['Indicador', 'Variación absoluta', '%'], ([['Despachos', m.total, r.prior.total], ['Km', m.kilometers, r.prior.kilometers], ['Respuesta min', m.responseMinutes, r.prior.responseMinutes], ['Asistencias registradas', m.assistances || null, r.prior.assistances || null]] as [string,number|null,number|null][]).map(([label,a,b]) => { const v=variation(a,b); return [label,formatMetric(v.absolute),formatMetric(v.percent)]; }));
  for (let i=1; i<=doc.getNumberOfPages(); i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Período ${r.period} · Generado ${r.generatedAt.slice(0,10)} · Uso institucional · ${i}/${doc.getNumberOfPages()}`, 14, 287); }
  return doc;
}
