import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  emergencyId: string;
  folio: string;
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

      // Fetch vehicles
      const { data: evData } = await supabase
        .from('emergency_vehicles')
        .select('*, vehicles(code, type, plate, companies(name, number))')
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

      // Generate PDF
      const doc = new jsPDF();
      const ek = emg.emergency_keys as any;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Ficha de Emergencia`, 14, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Folio: ${emg.folio}`, 14, 28);
      doc.text(`Clave: ${ek?.code ?? '—'} — ${ek?.name ?? '—'}`, 14, 34);
      doc.text(`Dirección: ${emg.address}`, 14, 40);
      if (emg.reference) doc.text(`Referencia: ${emg.reference}`, 14, 46);

      let y = emg.reference ? 52 : 46;
      doc.text(`Estado: ${emg.status}`, 14, y);
      y += 6;
      doc.text(`Creada: ${new Date(emg.created_at).toLocaleString('es-CL')}`, 14, y);
      y += 6;
      if (emg.caller_name) { doc.text(`Solicitante: ${emg.caller_name}`, 14, y); y += 6; }
      if (emg.caller_phone) { doc.text(`Teléfono: ${emg.caller_phone}`, 14, y); y += 6; }

      // Flags
      const flags: string[] = [];
      if (emg.declared) flags.push('Declarado');
      if (emg.external_support) flags.push('10-12 Apoyo Externo');
      if (emg.carabineros_requested) flags.push('1-0 Carabineros');
      if (emg.ambulance_requested) flags.push('1-2 Ambulancia');
      if (flags.length > 0) {
        doc.text(`Indicadores: ${flags.join(', ')}`, 14, y);
        y += 6;
      }

      if (emg.observations) {
        doc.text(`Observaciones: ${emg.observations}`, 14, y);
        y += 6;
      }

      // Vehicles table
      y += 4;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Móviles Asignados', 14, y);
      y += 2;

      const vehicleRows = (evData ?? []).map((ev: any) => {
        const v = ev.vehicles;
        return [
          v?.code ?? '—',
          v?.type ?? '—',
          v?.plate ?? '—',
          v?.companies?.name ?? '—',
          new Date(ev.assigned_at).toLocaleString('es-CL'),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Código', 'Tipo', 'Patente', 'Compañía', 'Asignado']],
        body: vehicleRows.length > 0 ? vehicleRows : [['Sin móviles asignados', '', '', '', '']],
        styles: { fontSize: 9 },
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
        head: [['Nombre', 'RUT', 'Rol', 'Grado', 'Compañía', 'Móvil', 'Teléfono']],
        body: personnelRows.length > 0 ? personnelRows : [['Sin personal asignado', '', '', '', '', '', '']],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 30] },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

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
