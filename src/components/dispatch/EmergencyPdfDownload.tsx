import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { resolveLogoUrl, toDataUrl } from '@/lib/logoStorage';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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

export default function EmergencyPdfDownload({ emergencyId, folio }: Props) {
  const [loading, setLoading] = useState(false);
  const { currentOrg } = useOrganization();

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
        .select('*, volunteers(name, rut, phone, companies(name), ranks(name)), emergency_vehicles(vehicles(code))')
        .eq('emergency_id', emergencyId);

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

      const vehicles = evData ?? [];
      const personnel = epData ?? [];

      // ---- Vehicle blocks ----
      const blocks = vehicles.length > 0 ? vehicles : [null];
      for (const ev of blocks) {
        const v = (ev as any)?.vehicles;
        const evId = (ev as any)?.id;

        // Personnel assigned to this vehicle
        const vehPersonnel = evId
          ? personnel.filter((ep: any) => ep.emergency_vehicle_id === evId || ep.emergency_vehicles?.vehicles?.code === v?.code)
          : personnel;
        const conductor = vehPersonnel.find((ep: any) =>
          (ep.role ?? '').toLowerCase().includes('conductor'))?.volunteers?.name ?? '';
        const aCargo = vehPersonnel.find((ep: any) => {
          const r = (ep.role ?? '').toLowerCase();
          return r.includes('cargo') || r.includes('oficial');
        })?.volunteers?.name ?? '';

        const assignedAt = (ev as any)?.assigned_at ?? emg.created_at;
        const releasedAt = (ev as any)?.released_at ?? null;

        // Row 1: MOVIL | CLAVE | HORA SALIDA | KM SALIDA | FECHA
        const lw = contentW * 0.11; // label width
        const vw = contentW * 0.09; // value width
        drawDataRow(
          ['MOVIL', v?.code ?? '', 'CLAVE', ek?.code ?? '', 'HORA SALIDA', fmtTime(assignedAt),
            'KM SALIDA', (ev as any)?.odometer_start != null ? String((ev as any).odometer_start) : '',
            'FECHA', fmtDate(assignedAt)],
          [lw, vw, lw, vw, lw + 4, vw, lw + 4, vw, lw, contentW - (4 * lw + 3 * vw + 8) - lw + vw + vw],
          11,
        );
        // Row 2: SECTOR | HORA LLEGADA | KM LLEGADA
        drawDataRow(
          ['SECTOR', emg.address ?? '', 'HORA LLEGADA', fmtTime(releasedAt),
            'KM LLEGADA', (ev as any)?.odometer_end != null ? String((ev as any).odometer_end) : ''],
          [lw, contentW * 0.40, lw + 6, vw + 4, lw + 6, contentW - (2 * lw + 12) - (2 * vw + 4) - contentW * 0.40],
          11,
        );
        // Row 3: CONDUCTOR/A | A CARGO
        drawDataRow(
          ['CONDUCTOR/A', conductor, 'A CARGO', aCargo],
          [contentW * 0.16, contentW * 0.34, contentW * 0.16, contentW * 0.34],
          11,
        );
        y += 4;
      }

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
