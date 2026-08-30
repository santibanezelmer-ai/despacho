ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS fuel_level integer,
  ADD COLUMN IF NOT EXISTS fuel_updated_at timestamptz;

CREATE TABLE public.vehicle_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  odometer integer,
  maintenance_type text NOT NULL,
  provider text,
  cost numeric,
  next_service_date date,
  next_service_odometer integer,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vm_select" ON public.vehicle_maintenance FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "vm_insert" ON public.vehicle_maintenance FOR INSERT TO authenticated
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vm_update" ON public.vehicle_maintenance FOR UPDATE TO authenticated
  USING (public.can_write_in_org(organization_id))
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vm_delete" ON public.vehicle_maintenance FOR DELETE TO authenticated
  USING (public.can_write_in_org(organization_id));
CREATE TRIGGER update_vehicle_maintenance_updated_at BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vehicle_maintenance_vehicle ON public.vehicle_maintenance(vehicle_id, service_date DESC);

CREATE TABLE public.vehicle_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number text,
  issued_at date,
  expires_at date,
  file_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_documents TO authenticated;
GRANT ALL ON public.vehicle_documents TO service_role;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vd_select" ON public.vehicle_documents FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "vd_insert" ON public.vehicle_documents FOR INSERT TO authenticated
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vd_update" ON public.vehicle_documents FOR UPDATE TO authenticated
  USING (public.can_write_in_org(organization_id))
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vd_delete" ON public.vehicle_documents FOR DELETE TO authenticated
  USING (public.can_write_in_org(organization_id));
CREATE TRIGGER update_vehicle_documents_updated_at BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id, expires_at);

CREATE TABLE public.vehicle_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  emergency_id uuid REFERENCES public.emergencies(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'salida',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  odometer integer,
  fuel_level integer,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_checklists TO authenticated;
GRANT ALL ON public.vehicle_checklists TO service_role;
ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vc_select" ON public.vehicle_checklists FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "vc_insert" ON public.vehicle_checklists FOR INSERT TO authenticated
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vc_update" ON public.vehicle_checklists FOR UPDATE TO authenticated
  USING (public.can_write_in_org(organization_id))
  WITH CHECK (public.can_write_in_org(organization_id));
CREATE POLICY "vc_delete" ON public.vehicle_checklists FOR DELETE TO authenticated
  USING (public.can_write_in_org(organization_id));
CREATE TRIGGER update_vehicle_checklists_updated_at BEFORE UPDATE ON public.vehicle_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vehicle_checklists_vehicle ON public.vehicle_checklists(vehicle_id, created_at DESC);