import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, Siren, LogOut, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ orgName: '', phone: '', commune: '', region: '', message: '' });

  useEffect(() => {
    if (!user) return;
    const fetchRequest = async () => {
      const { data } = await (supabase as any)
        .from('organization_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRequest(data);
      setLoading(false);
    };
    fetchRequest();
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgName) { toast.error('Nombre de organización requerido'); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('organization_requests').insert({
        user_id: user?.id,
        organization_name: form.orgName,
        applicant_name: user?.user_metadata?.full_name ?? user?.email ?? '',
        applicant_email: user?.email ?? '',
        phone: form.phone || null,
        commune: form.commune || null,
        region: form.region || null,
        message: form.message || null,
      });
      if (error) throw error;
      toast.success('Solicitud enviada');
      setShowForm(false);
      // Refetch
      const { data } = await (supabase as any).from('organization_requests').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setRequest(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-emergency" /></div>;

  const statusConfig: Record<string, { icon: any; color: string; label: string; desc: string }> = {
    pending: { icon: Clock, color: 'text-warning', label: 'Pendiente', desc: 'Tu solicitud está siendo revisada por un administrador.' },
    approved: { icon: CheckCircle, color: 'text-success', label: 'Aprobada', desc: 'Tu solicitud fue aprobada. Recarga la página para acceder.' },
    rejected: { icon: XCircle, color: 'text-destructive', label: 'Rechazada', desc: 'Tu solicitud fue rechazada. Contacta al administrador.' },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency">
            <Siren className="h-7 w-7 text-emergency-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Central de Bomberos</h1>
        </div>

        {request ? (
          <div className="console-panel p-6 space-y-4 text-center">
            {(() => {
              const cfg = statusConfig[request.status] ?? statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <>
                  <Icon className={`mx-auto h-10 w-10 ${cfg.color}`} />
                  <h2 className="text-sm font-semibold">{request.organization_name}</h2>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.color} bg-current/10`}>
                    {cfg.label}
                  </span>
                  <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                </>
              );
            })()}
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
            </Button>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmitRequest} className="console-panel p-6 space-y-3">
            <h2 className="text-sm font-semibold">Solicitar Organización</h2>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nombre del cuerpo *</label>
              <Input value={form.orgName} onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))} required className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Comuna</label>
                <Input value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Región</label>
                <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className="bg-muted/50" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Mensaje</label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="bg-muted/50 h-16" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Solicitud
            </Button>
          </form>
        ) : (
          <div className="console-panel p-6 space-y-4 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Sin organización asignada</h2>
            <p className="text-xs text-muted-foreground">No perteneces a ninguna organización. Puedes solicitar la creación de una o esperar una invitación.</p>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-emergency text-emergency-foreground hover:bg-emergency/90">
              Solicitar Organización
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
