import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function SuperadminRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['superadmin-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organization_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleApprove = async (req: any) => {
    try {
      // Create the organization
      const slug = req.organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: org, error: orgErr } = await (supabase as any)
        .from('organizations')
        .insert({
          name: req.organization_name,
          slug: slug + '-' + Date.now().toString(36),
          status: 'active',
          commune: req.commune,
          region: req.region,
          phone: req.phone,
          created_by: req.user_id,
          approved_by: user?.id,
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      // Add requester as admin member if they have a user_id
      if (req.user_id) {
        await (supabase as any).from('organization_members').insert({
          organization_id: org.id,
          user_id: req.user_id,
          role: 'admin',
          status: 'active',
        });
      }

      // Update request status
      await (supabase as any).from('organization_requests')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', req.id);

      toast.success(`Organización "${req.organization_name}" aprobada y creada`);
      qc.invalidateQueries({ queryKey: ['superadmin-requests'] });
      qc.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      qc.invalidateQueries({ queryKey: ['superadmin-stats'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    const { error } = await (supabase as any).from('organization_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) toast.error(error.message);
    else { toast.success('Solicitud rechazada'); qc.invalidateQueries({ queryKey: ['superadmin-requests'] }); }
  };

  const pending = (requests ?? []).filter((r: any) => r.status === 'pending');
  const resolved = (requests ?? []).filter((r: any) => r.status !== 'pending');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5 text-warning" /> Solicitudes de Registro
      </h1>

      <h2 className="text-sm font-semibold text-warning">Pendientes ({pending.length})</h2>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : pending.length === 0 ? (
        <div className="console-panel p-6 text-center text-sm text-muted-foreground">No hay solicitudes pendientes</div>
      ) : (
        <div className="space-y-3">
          {pending.map((r: any) => (
            <div key={r.id} className="console-panel p-4 border-l-4 border-warning">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-foreground">{r.organization_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.applicant_name} · {r.applicant_email}</p>
                  {r.commune && <p className="text-xs text-muted-foreground">{r.commune}{r.region ? `, ${r.region}` : ''}</p>}
                  {r.message && <p className="text-xs text-muted-foreground mt-2 italic">"{r.message}"</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString('es-CL')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(r)} className="bg-success hover:bg-success/90 text-white text-xs gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(r)} className="text-destructive border-destructive/30 text-xs gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mt-8">Historial ({resolved.length})</h2>
          <div className="console-panel overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {resolved.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-foreground">{r.organization_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.applicant_email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${r.status === 'approved' ? 'text-success' : 'text-destructive'}`}>
                        {r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
