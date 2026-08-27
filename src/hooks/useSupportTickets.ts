import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export type SupportStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
export type SupportPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface SupportTicket {
  id: string;
  organization_id: string;
  created_by: string | null;
  subject: string;
  category: string;
  priority: SupportPriority;
  description: string;
  status: SupportStatus;
  contact_email: string | null;
  route: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_id: string | null;
  is_support: boolean;
  message: string;
  created_at: string;
}

export const SUPPORT_CATEGORIES = [
  { value: 'general', label: 'Consulta general' },
  { value: 'despacho', label: 'Consola de despacho' },
  { value: 'notificaciones', label: 'Notificaciones / tonos' },
  { value: 'mapa', label: 'Mapa y ubicación' },
  { value: 'usuarios', label: 'Usuarios e invitaciones' },
  { value: 'pwa', label: 'App de voluntarios (PWA)' },
  { value: 'reportes', label: 'Reportes y exportaciones' },
  { value: 'error', label: 'Error de la plataforma' },
];

export const STATUS_LABEL: Record<SupportStatus, string> = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const PRIORITY_LABEL: Record<SupportPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

/** Tickets de la organización actual (aislamiento por organización vía RLS + filtro). */
export function useOrgSupportTickets() {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['support-tickets', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

/** Todos los tickets del SaaS (solo superadmin, permitido por RLS). */
export function useAllSupportTickets() {
  return useQuery({
    queryKey: ['support-tickets-all'],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .select('*, organizations(name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (SupportTicket & { organizations: { name: string; slug: string } | null })[];
    },
  });
}

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ['support-ticket-messages', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });
}

export function useCreateSupportTicket() {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      subject: string;
      category: string;
      priority: SupportPriority;
      description: string;
      contact_email?: string | null;
    }) => {
      if (!orgId || !user) throw new Error('Sin organización activa');
      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          subject: input.subject.trim(),
          category: input.category,
          priority: input.priority,
          description: input.description.trim(),
          contact_email: input.contact_email?.trim() || user.email,
          route: typeof window !== 'undefined' ? window.location.pathname : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useAddTicketMessage() {
  const { user, isSuperadmin } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { ticket: Pick<SupportTicket, 'id' | 'organization_id'>; message: string }) => {
      if (!user) throw new Error('Sesión no válida');
      const { error } = await (supabase as any).from('support_ticket_messages').insert({
        ticket_id: input.ticket.id,
        organization_id: input.ticket.organization_id,
        author_id: user.id,
        is_support: isSuperadmin,
        message: input.message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['support-ticket-messages', vars.ticket.id] });
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; status: SupportStatus }) => {
      const { error } = await (supabase as any)
        .from('support_tickets')
        .update({
          status: input.status,
          resolved_at: input.status === 'resuelto' || input.status === 'cerrado' ? new Date().toISOString() : null,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets-all'] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}
