CREATE TYPE public.support_ticket_status AS ENUM ('abierto','en_proceso','resuelto','cerrado');
CREATE TYPE public.support_ticket_priority AS ENUM ('baja','media','alta','critica');

CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority public.support_ticket_priority NOT NULL DEFAULT 'media',
  description text NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'abierto',
  contact_email text,
  route text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_org ON public.support_tickets(organization_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT TO authenticated
USING (public.is_superadmin() OR public.is_org_member(organization_id));

CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR (created_by = auth.uid() AND public.is_org_member(organization_id) AND status = 'abierto')
)
WITH CHECK (
  public.is_superadmin()
  OR (created_by = auth.uid() AND public.is_org_member(organization_id))
);

CREATE POLICY "support_tickets_delete" ON public.support_tickets FOR DELETE TO authenticated
USING (public.is_superadmin());

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  is_support boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT DELETE ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_ticket_messages_select" ON public.support_ticket_messages FOR SELECT TO authenticated
USING (public.is_superadmin() OR public.is_org_member(organization_id));

CREATE POLICY "support_ticket_messages_insert" ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id AND t.organization_id = support_ticket_messages.organization_id
  )
  AND (
    (public.is_superadmin() AND is_support = true)
    OR (public.is_org_member(organization_id) AND is_support = false)
  )
);

CREATE POLICY "support_ticket_messages_delete" ON public.support_ticket_messages FOR DELETE TO authenticated
USING (public.is_superadmin());

CREATE TRIGGER update_support_ticket_messages_updated_at BEFORE UPDATE ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();