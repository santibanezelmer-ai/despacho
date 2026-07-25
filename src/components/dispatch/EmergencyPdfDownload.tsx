import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { resolveLogoUrl, toDataUrl } from '@/lib/logoStorage';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  emergencyId: string;
  folio: string;
}

async function logoToDataUrl(value?: string | null): Promise<string | null> {
  const url = await resolveLogoUrl(value);
  if (!url) return null;
  return await toDataUrl(url);
}

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

      // Fetch log
      const { data: logData } = await supabase
        .from('emergency_log')
        .select('message, created_at')
        .eq('emergency_id', emergencyId)
        .order('created_at', { ascending: true });

      // Resolve logos (org + unique companies)
      const orgLogo = await logoToDataUrl(orgRow?.logo_url);
      const companyLogos = new Map<string, string>();
      const uniqueCompanies = new Map<string, string | null>();
      (evData ?? []).forEach((ev: any) => {
        const c = ev.vehicles?.companies;
        if (c?.id && !uniqueCompanies.has(c.id)) uniqueCompanies.set(c.id, c.logo_url ?? null);
      });
      for (const [cid, lu] of uniqueCompanies) {
        const d = await logoToDataUrl(lu);
        if (d) companyLogos.set(cid, d);
      }

      // Generate PDF
      const doc = new jsPDF();
      const ek = emg.emergency_keys as any;
      const pageW = doc.internal.pageSize.getWidth();

      // Header band with logo + org name
      if (orgLogo) {
        try { doc.addImage(orgLogo, 'PNG', 14, 10, 18, 18); } catch { /* ignore */ }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(orgRow?.name || currentOrg?.organization?.name || 'Cuerpo de Bomberos', orgLogo ? 36 : 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Ficha de Emergencia', orgLogo ? 36 : 14, 25);
      doc.setDrawColor(200);
      doc.line(14, 32, pageW - 14, 32);

      let y = 40;
      doc.setFontSize(11);
      doc.text(`Folio: ${emg.folio}`, 14, y); y += 6;
      doc.text(`Clave: ${ek?.code ?? '—'} — ${ek?.name ?? '—'}`, 14, y); y += 6;
      doc.text(`Dirección: ${emg.address}`, 14, y); y += 6;
      if (emg.reference) { doc.text(`Referencia: ${emg.reference}`, 14, y); y += 6; }
      doc.text(`Estado: ${emg.status}`, 14, y); y += 6;
      doc.text(`Creada: ${new Date(emg.created_at).toLocaleString('es-CL')}`, 14, y); y += 6;
      if (emg.caller_name) { doc.text(`Solicitante: ${emg.caller_name}`, 14, y); y += 6; }
      if (emg.caller_phone) { doc.text(`Teléfono: ${emg.caller_phone}`, 14, y); y += 6; }

      const flags: string[] = [];
      if (emg.declared) flags.push('Declarado');
      if (emg.external_support) flags.push('10-12 Apoyo Externo');
      if (emg.carabineros_requested) flags.push('1-0 Carabineros');
      if (emg.ambulance_requested) flags.push('1-2 Ambulancia');
      if (emg.false_alarm) flags.push('6-16 Falsa Alarma');
      if (flags.length > 0) {
        doc.text(`Indicadores: ${flags.join(', ')}`, 14, y);
        y += 6;
      }

      if (emg.observations) {
        const lines = doc.splitTextToSize(`Observaciones: ${emg.observations}`, pageW - 28);
        doc.text(lines, 14, y);
        y += 6 * lines.length;
      }
      if ((emg as any).pre_report) {
        const lines = doc.splitTextToSize(`Pre-informe: ${(emg as any).pre_report}`, pageW - 28);
        doc.text(lines, 14, y);
        y += 6 * lines.length;
      }

      // Vehicles table
      y += 4;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Móviles Asignados', 14, y);
      y += 2;

      const vehicleRows = (evData ?? []).map((ev: any) => {
        const v = ev.vehicles;
        const kmRecorrido = ev.odometer_start != null && ev.odometer_end != null
          ? ev.odometer_end - ev.odometer_start
          : '—';
        return [
          v?.code ?? '—',
          v?.type ?? '—',
          v?.plate ?? '—',
          v?.companies?.name ?? '—',
          ev.odometer_start ?? '—',
          ev.odometer_end ?? '—',
          kmRecorrido,
          ev.released_at ? new Date(ev.released_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—',
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Código', 'Tipo', 'Patente', 'Compañía', 'Km Salida', 'Km Llegada', 'Recorrido', 'Retorno']],
        body: vehicleRows.length > 0 ? vehicleRows : [['Sin móviles asignados', '', '', '', '', '', '', '']],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 30] },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Personnel table
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Personal Asignado', 14, y);
      y += 2;

      const personnelRows = (epData ?? []).map((ep: any) => {
        const vol = ep.volunteers;
        return [
          vol?.name ?? '—',
          vol?.rut ?? '—',
          ep.role ?? 'voluntario',
          vol?.ranks?.name ?? '—',
          vol?.companies?.name ?? '—',
          ep.emergency_vehicles?.vehicles?.code ?? '—',
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Nombre', 'RUT', 'Rol', 'Grado', 'Compañía', 'Móvil']],
        body: personnelRows.length > 0 ? personnelRows : [['Sin personal asignado', '', '', '', '', '']],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 30] },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Company logos strip (participating companies)
      if (companyLogos.size > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Compañías participantes', 14, y);
        y += 4;
        let x = 14;
        for (const [cid, dataUrl] of companyLogos) {
          const cName = uniqueCompanies.has(cid)
            ? (evData ?? []).find((ev: any) => ev.vehicles?.companies?.id === cid)?.vehicles?.companies?.name ?? ''
            : '';
          try { doc.addImage(dataUrl, 'PNG', x, y, 16, 16); } catch { /* ignore */ }
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(cName.slice(0, 18), x, y + 20);
          x += 26;
          if (x > pageW - 26) { x = 14; y += 24; }
        }
        y += 26;
      }

      // Log
      if (logData && logData.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Bitácora', 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [['Hora', 'Evento']],
          body: logData.map(l => [
            new Date(l.created_at).toLocaleString('es-CL'),
            l.message,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 30, 30] },
        });
      }

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
