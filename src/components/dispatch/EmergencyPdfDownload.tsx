import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { resolveLogoUrl, toDataUrl } from '@/lib/logoStorage';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { VEHICLE_STATUS_META } from '@/lib/vehicleOperationalStatus';

interface Props {
  emergencyId: string;
  folio: string;
}

async function logoToDataUrl(value?: string | null): Promise<string | null> {
  const url = await resolveLogoUrl(value);
  if (!url) return null;
  return await toDataUrl(url);
}

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CL') : '';
const fmtDateTime = (iso?: string | null) =>
  iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : 'Sin hora registrada';

const is109 = (code?: string | null) => {
  const c = (code ?? '').replace(/\s/g, '').toLowerCase();
  return c === '10-9' || c === '109';
};

type KeyEntry = { code: string; description: string; at: string | null };

/** Claves operativas reales de UN móvil: bitácora + marcas de tiempo guardadas. */
function vehicleKeyHistory(ev: any, logs: any[]): KeyEntry[] {
  const code = ev?.vehicles?.code;
  const entries: KeyEntry[] = [];
  const M = VEHICLE_STATUS_META;
  if (ev?.assigned_at) entries.push({ code: M.despachado.code, description: M.despachado.description, at: ev.assigned_at });
  const prefix = code ? `Móvil ${code} marcó clave ` : null;
  const fromLog = prefix
    ? logs.filter(l => typeof l.message === 'string' && l.message.startsWith(prefix))
    : [];
  if (fromLog.length > 0) {
    for (const l of fromLog) {
      const rest = l.message.slice(prefix!.length);
      const [k, ...d] = rest.split(' — ');
      entries.push({ code: k.trim(), description: d.join(' - ').trim(), at: l.created_at });
    }
  } else {
    if (ev?.on_scene_at) entries.push({ code: M.en_lugar.code, description: M.en_lugar.description, at: ev.on_scene_at });
    if (ev?.controlled_at) entries.push({ code: M.controlada.code, description: M.controlada.description, at: ev.controlled_at });
    if (ev?.withdrawing_at) entries.push({ code: M.retirandose.code, description: M.retirandose.description, at: ev.withdrawing_at });
  }
  // Una reasignación desde 6-9/10-9 cierra la participación sin volver a cuartel:
  // se registra como reasignación, nunca como un 6-10.
  const reassign = code
    ? logs.find(l => typeof l.message === 'string' && l.message.startsWith(`Móvil ${code} reasignado a `))
    : null;
  if (reassign) {
    const target = reassign.message.slice(`Móvil ${code} reasignado a `.length).split(' desde ')[0];
    entries.push({ code: 'REASIGNADO', description: `Reasignado a ${target} (sin retorno a cuartel)`, at: reassign.created_at });
  } else if (ev?.released_at) {
    entries.push({ code: M.en_cuartel.code, description: M.en_cuartel.description, at: ev.released_at });
  }
  return entries.sort((a, b) => (a.at ? Date.parse(a.at) : Infinity) - (b.at ? Date.parse(b.at) : Infinity));
}

export default function EmergencyPdfDownload({ emergencyId, folio }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Fetch emergency with key
      const { data: emg, error: emgErr } = await supabase
        .from('emergencies')
        .select('*, emergency_keys(code, name, color)')
        .eq('id', emergencyId)
        .single();
      if (emgErr) throw emgErr;

      // Fetch org (name + logo)
      const orgId = (emg as any).organization_id;
      const { data: orgRow } = await (supabase as any)
        .from('organizations')
        .select('name, logo_url')
        .eq('id', orgId)
        .single();

      // Fetch vehicles
      const { data: evData } = await supabase
        .from('emergency_vehicles')
        .select('*, vehicles(code, type, plate, companies(id, name, number, logo_url))')
        .eq('emergency_id', emergencyId);

      // Fetch personnel
      const { data: epData } = await supabase
        .from('emergency_personnel')
        .select('*, volunteers(name, code, rut, phone, companies(name), ranks(name)), emergency_vehicles(vehicles(code))')
        .eq('emergency_id', emergencyId);

      // Bitácora (claves marcadas por cada móvil)
      const { data: logData } = await supabase
        .from('emergency_log')
        .select('message, created_at')
        .eq('emergency_id', emergencyId)
        .order('created_at', { ascending: true });
      const logs = logData ?? [];

      // Resolve org logo + first company logo
      const orgLogo = await logoToDataUrl(orgRow?.logo_url);
      let companyLogo: string | null = null;
      for (const ev of evData ?? []) {
        const c = (ev as any).vehicles?.companies;
        if (c?.logo_url) {
          companyLogo = await logoToDataUrl(c.logo_url);
          if (companyLogo) break;
        }
      }

      const ek = emg.emergency_keys as any;
      const doc = new jsPDF({ unit: 'mm', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;

      // ---- Header: logos + centered title ----
      if (orgLogo) {
        try { doc.addImage(orgLogo, 'PNG', margin, 10, 16, 16); } catch { /* ignore */ }
      }
      if (companyLogo) {
        try { doc.addImage(companyLogo, 'PNG', pageW - margin - 16, 10, 16, 16); } catch { /* ignore */ }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SALIDA DE MOVIL 2026.', pageW / 2, 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (orgRow?.name) doc.text(orgRow.name, pageW / 2, 26, { align: 'center' });

      let y = 34;

      // Helper: draw a bordered label/values row
      // cells: [label, value, label, value, ...] with given widths (mm)
      const drawDataRow = (cells: (string | null)[], widths: number[], rowH = 10) => {
        let x = margin;
        doc.setLineWidth(0.3);
        doc.setDrawColor(0);
        cells.forEach((cell, i) => {
          const w = widths[i];
          doc.rect(x, y, w, rowH);
          const isLabel = i % 2 === 0;
          doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
          doc.setFontSize(isLabel ? 6.5 : 9);
          const lines = cell ? doc.splitTextToSize(cell, w - 3) : [];
          if (isLabel) {
            doc.text(lines, x + 1.5, y + 3.5);
          } else if (cell) {
            doc.text(lines, x + w / 2, y + rowH / 2 + 1.5, { align: 'center', maxWidth: w - 3 });
          }
          x += w;
        });
        y += rowH;
      };

      const ensure = (need: number) => {
        if (y + need > pageH - 16) { doc.addPage(); y = 20; }
      };
      const sectionTitle = (t: string) => {
        ensure(16);
        doc.setFillColor(225, 225, 225);
        doc.rect(margin, y, contentW, 7, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(t, margin + 2, y + 5);
        y += 7;
      };

      // ---- Información de la emergencia ----
      sectionTitle('INFORMACIÓN DE LA EMERGENCIA');
      const emergencyName = ek?.name?.trim() || 'Sin nombre registrado';
      const nameLines = doc.splitTextToSize(emergencyName, contentW - 42);
      drawDataRow(['NOMBRE DE LA\nEMERGENCIA', emergencyName], [38, contentW - 38], Math.max(12, nameLines.length * 4.5 + 4));
      drawDataRow(['FOLIO', emg.folio ?? '', 'CLAVE', ek?.code ?? '', 'FECHA', fmtDate(emg.created_at)],
        [18, 50, 18, 40, 18, contentW - 144], 10);
      if (is109(ek?.code)) {
        const auth = (emg as any).caller_name?.trim();
        drawDataRow(['AUTORIZADO\nPOR', auth || 'No registrado'], [38, contentW - 38], 10);
      }
      y += 5;

      const vehicles = evData ?? [];
      const personnel = epData ?? [];
      const personLabel = (ep: any) => {
        if (!ep) return '';
        const name = ep.volunteers?.name ?? '';
        const id = ep.volunteers?.code?.trim();
        return `${name} - ID: ${id || 'sin ID registrado'}`;
      };

      // ---- Información de los móviles ----
      sectionTitle('INFORMACIÓN DE LOS MÓVILES');
      if (vehicles.length === 0) {
        drawDataRow(['MÓVILES', 'Sin móviles asignados'], [38, contentW - 38], 10);
      }
      for (const ev of vehicles) {
        ensure(60);
        const v = (ev as any)?.vehicles;
        const evId = (ev as any)?.id;
        const vehPersonnel = personnel.filter((ep: any) => ep.emergency_vehicle_id === evId);
        const conductor = vehPersonnel.find((ep: any) => ep.role === 'conductor');
        const aCargo = vehPersonnel.find((ep: any) => ep.role === 'oficial_a_cargo');
        const assignedAt = (ev as any)?.assigned_at ?? emg.created_at;
        const releasedAt = (ev as any)?.released_at ?? null;

        const r1: number[] = [16, 22, 14, 22, 18, 22, 18, 22, 14, contentW - 168];
        drawDataRow(
          ['MOVIL', v?.code ?? '', 'CLAVE', ek?.code ?? '', 'HORA\nSALIDA', fmtTime(assignedAt),
            'KM\nSALIDA', (ev as any)?.odometer_start != null ? String((ev as any).odometer_start) : '',
            'FECHA', fmtDate(assignedAt)],
          r1, 11,
        );
        const r2: number[] = [18, 70, 22, 26, 22, contentW - 158];
        drawDataRow(
          ['SECTOR', emg.address ?? '', 'HORA\nLLEGADA', fmtTime(releasedAt),
            'KM\nLLEGADA', (ev as any)?.odometer_end != null ? String((ev as any).odometer_end) : ''],
          r2, 11,
        );
        drawDataRow(['CONDUCTOR/A', personLabel(conductor)], [38, contentW - 38], 9);
        drawDataRow(['OFICIAL A\nCARGO', personLabel(aCargo)], [38, contentW - 38], 9);

        // Claves operativas de este móvil (orden cronológico)
        const keys = vehicleKeyHistory(ev, logs);
        const cw = [22, contentW - 22 - 44, 44];
        const head = (label: string) => {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
          let x = margin;
          ['CLAVE', `REGISTRO DE CLAVES · ${label}`, 'FECHA Y HORA'].forEach((h, i) => {
            doc.rect(x, y, cw[i], 6); doc.text(h, x + 1.5, y + 4); x += cw[i];
          });
          y += 6;
        };
        ensure(14);
        head(v?.code ?? 'MÓVIL');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        if (keys.length === 0) {
          doc.rect(margin, y, contentW, 6);
          doc.text('Sin claves registradas', margin + 1.5, y + 4);
          y += 6;
        }
        for (const k of keys) {
          if (y + 6 > pageH - 16) { doc.addPage(); y = 20; head(`${v?.code ?? 'MÓVIL'} (cont.)`); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); }
          const desc = doc.splitTextToSize(k.description || '', cw[1] - 3)[0] ?? '';
          let x = margin;
          [k.code, desc, fmtDateTime(k.at)].forEach((c, i) => {
            doc.rect(x, y, cw[i], 6); doc.text(c, x + 1.5, y + 4); x += cw[i];
          });
          y += 6;
        }
        y += 5;
      }

      // ---- Preinforme ----
      sectionTitle('PREINFORME');
      const pre = ((emg as any).pre_report ?? '').trim();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const preLines: string[] = pre
        ? pre.split(/\r?\n/).flatMap((ln: string) => (ln.trim() ? doc.splitTextToSize(ln, contentW - 4) : ['']))
        : ['Sin preinforme registrado'];
      const lh = 4.4;
      let chunkStart = y;
      doc.setLineWidth(0.3);
      for (const ln of preLines) {
        if (y + lh > pageH - 16) {
          doc.rect(margin, chunkStart, contentW, y - chunkStart + 2);
          doc.addPage(); y = 20; chunkStart = y;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        }
        doc.text(ln, margin + 2, y + 4);
        y += lh;
      }
      doc.rect(margin, chunkStart, contentW, y - chunkStart + 2);
      y += 8;

      // ---- Personnel by company ----
      const byCompany = new Map<string, any[]>();
      personnel.forEach((ep: any) => {
        const cname = ep.volunteers?.companies?.name ?? 'SIN COMPAÑÍA';
        if (!byCompany.has(cname)) byCompany.set(cname, []);
        byCompany.get(cname)!.push(ep);
      });

      for (const [companyName, list] of byCompany) {
        if (y > pageH - 90) { doc.addPage(); y = 20; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`OFICIALES Y VOLUNTARIOS ${companyName.toUpperCase()}.`, pageW / 2, y + 4, { align: 'center' });
        y += 9;

        // 3 column-pairs: NOMBRES | FIRMA ×3
        const pairW = contentW / 3;
        const nameW = pairW * 0.68;
        const signW = pairW * 0.32;
        const rowH = 9;

        // Header row
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        for (let c = 0; c < 3; c++) {
          const x = margin + c * pairW;
          doc.rect(x, y, nameW, 7);
          doc.rect(x + nameW, y, signW, 7);
          doc.text('NOMBRES', x + nameW / 2, y + 4.5, { align: 'center' });
          doc.text('FIRMA', x + nameW + signW / 2, y + 4.5, { align: 'center' });
        }
        y += 7;

        // Distribute: fill column-pairs top to bottom, then left to right
        const names = list.map((ep: any) => {
          const rank = ep.volunteers?.ranks?.name;
          const name = ep.volunteers?.name ?? '';
          return (rank ? `${rank.toUpperCase()} ` : '') + name.toUpperCase();
        });
        const totalRows = Math.max(12, Math.ceil(names.length / 3));

        doc.setFontSize(7.5);
        for (let r = 0; r < totalRows; r++) {
          if (y > pageH - 45) { doc.addPage(); y = 20; }
          for (let c = 0; c < 3; c++) {
            const x = margin + c * pairW;
            doc.rect(x, y, nameW, rowH);
            doc.rect(x + nameW, y, signW, rowH);
            const idx = c * totalRows + r;
            const nm = names[idx];
            if (nm) {
              doc.setFont('helvetica', 'normal');
              const lines = doc.splitTextToSize(nm, nameW - 3);
              doc.text(lines[0] ?? '', x + 1.5, y + rowH / 2 + 1.2);
            }
          }
          y += rowH;
        }
        y += 8;
      }

      // ---- Footer: OBAC signature ----
      if (y > pageH - 40) { doc.addPage(); y = 20; }
      y = Math.max(y + 10, pageH - 38);
      doc.setLineWidth(0.4);
      doc.line(pageW / 2 - 50, y, pageW / 2 + 50, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NOMBRE Y FIRMA OBAC.', pageW / 2, y + 5, { align: 'center' });

      doc.save(`${folio}.pdf`);
      toast.success('Ficha descargada');
    } catch (err: any) {
      toast.error(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={loading}
      className="gap-1.5 text-xs"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Descargar Ficha
    </Button>
  );
}
