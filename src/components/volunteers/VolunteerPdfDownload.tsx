import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { buildVolunteerPdf, volunteerPdfFileName } from '@/lib/volunteerPdf';

interface Props {
  volunteer: any;
  training: any[];
  equipment: any[];
  attendance: any[];
  records: any[];
}

export default function VolunteerPdfDownload({ volunteer, training, equipment, attendance, records }: Props) {
  const { currentOrg } = useOrganization();
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    try {
      const doc = buildVolunteerPdf({
        volunteer,
        training,
        equipment,
        attendance,
        records,
        orgName: currentOrg?.organization?.name ?? 'Organización',
      });
      doc.save(volunteerPdfFileName(volunteer?.name));
      toast.success('Ficha generada');
    } catch (e) {
      console.error('[VolunteerPdf]', e);
      toast.error('No se pudo generar la ficha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" className="text-xs" onClick={generate} disabled={busy}>
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}
      Imprimir ficha
    </Button>
  );
}
