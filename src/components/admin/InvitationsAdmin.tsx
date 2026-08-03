import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Copy, Trash2, Send, UserPlus, RefreshCw, Ban } from 'lucide-react';
import { z } from 'zod';
import { useTimeFormat } from '@/hooks/useTimeFormat';

type OrgRole = 'admin' | 'operador' | 'oficial' | 'visor' | 'voluntario';

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  oficial: 'Oficial',
  visor: 'Voluntario (PWA)',
  voluntario: 'Voluntario (PWA)',
};

const inviteSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  role: z.enum(['admin', 'operador', 'oficial', 'visor', 'voluntario']),
  expires_in_days: z.number().int().min(1).max(90),
});

export default function InvitationsAdmin() {
  const { formatDateTime } = useTimeFormat();
  const { orgId, isOrgAdmin, currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('voluntario');
  const [expiresDays, setExpiresDays] = useState<number>(7);

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['org-invitations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId && isOrgAdmin,
  });

  const sendInvite = useMutation({
    mutationFn: async (opts: { email: string; role: OrgRole; expires_in_days: number; resend?: boolean }) => {
      const parsed = inviteSchema.safeParse(opts);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          organization_id: orgId,
          email: parsed.data.email,
          role: parsed.data.role,
          expires_in_days: parsed.data.expires_in_days,
          resend: !!opts.resend,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (res: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-invitations', orgId] });
      const url = res?.invite_url;
      if (url) navigator.clipboard?.writeText(url).catch(() => {});
      if (res?.email_sent) {
        toast.success(vars.resend ? 'Invitación reenviada · link copiado' : 'Invitación enviada · link copiado');
      } else {
        toast.warning(res?.warning ?? 'Invitación creada — envía el link manualmente');
      }
      if (!vars.resend) setEmail('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('organization_invitations')
        .update({ status: 'revoked', expires_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-invitations', orgId] });
      toast.success('Invitación revocada — el link ya no funciona');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('organization_invitations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-invitations', orgId] });
      toast.success('Invitación eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const sendByEmail = (inv: any) => {
    const url = `${window.location.origin}/invite/${inv.token}`;
    const subject = encodeURIComponent(`Invitación a ${currentOrg?.organization?.name ?? 'la organización'}`);
    const body = encodeURIComponent(
      `Has sido invitado a unirte a ${currentOrg?.organization?.name ?? 'la organización'} como ${ROLE_LABELS[inv.role as OrgRole]}.\n\nAcepta tu invitación aquí:\n${url}\n\nEste link expira el ${new Date(inv.expires_at).toLocaleDateString()}.`
    );
    window.open(`mailto:${inv.email}?subject=${subject}&body=${body}`);
  };

  if (!isOrgAdmin) return null;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
      expired: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return map[status] ?? '';
  };

  const fmtRel = (d?: string | null) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Invitaciones</h2>
          <p className="text-xs text-muted-foreground">Invita usuarios a tu organización por email o link</p>
        </div>
      </div>

      <div className="console-panel p-4 flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-muted/50 flex-1"
        />
        <Select value={role} onValueChange={v => setRole(v as OrgRole)}>
          <SelectTrigger className="w-full sm:w-40 bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['admin', 'operador', 'oficial', 'voluntario'] as OrgRole[]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={90}
            value={expiresDays}
            onChange={e => setExpiresDays(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
            className="w-20 bg-muted/50"
            title="Días hasta expirar"
          />
          <span className="text-xs text-muted-foreground">días</span>
        </div>
        <Button
          onClick={() => sendInvite.mutate({ email, role, expires_in_days: expiresDays })}
          disabled={!email || sendInvite.isPending}
        >
          <Send className="h-4 w-4 mr-2" />
          Invitar
        </Button>
      </div>

      <div className="console-panel-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Rol</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Último envío</TableHead>
              <TableHead className="text-xs">Expira</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">Cargando...</TableCell></TableRow>
            ) : !invitations?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">Sin invitaciones aún</TableCell></TableRow>
            ) : invitations.map((inv: any) => {
              const isExpired = new Date(inv.expires_at) < new Date();
              const effectiveStatus = inv.status === 'pending' && isExpired ? 'expired' : inv.status;
              return (
              <TableRow key={inv.id} className="border-border/30">
                <TableCell className="text-sm">{inv.email}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{ROLE_LABELS[inv.role as OrgRole]}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${statusBadge(effectiveStatus)}`}>{effectiveStatus}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRel(inv.last_sent_at ?? inv.created_at)}
                  {inv.resend_count > 0 && <span className="ml-1 text-[10px] text-primary">·{inv.resend_count}x</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {inv.status === 'pending' && (
                      <>
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2"
                          onClick={() => sendInvite.mutate({ email: inv.email, role: inv.role, expires_in_days: expiresDays, resend: true })}
                          disabled={sendInvite.isPending}
                          title="Reenviar email"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyLink(inv.token)} title="Copiar link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => sendByEmail(inv)} title="Enviar por email (cliente)">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-amber-500 hover:text-amber-500"
                          onClick={() => {
                            if (confirm(`¿Revocar el link enviado a ${inv.email}? Dejará de funcionar de inmediato.`)) revokeInvitation.mutate(inv.id);
                          }}
                          title="Revocar link"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => {
                      if (confirm(`¿Eliminar registro de invitación de ${inv.email}?`)) deleteInvitation.mutate(inv.id);
                    }} title="Eliminar registro">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );})}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
