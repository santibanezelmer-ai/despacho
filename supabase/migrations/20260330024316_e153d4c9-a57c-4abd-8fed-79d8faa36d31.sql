
-- New enums
CREATE TYPE public.org_role AS ENUM ('admin','operador','oficial','visor');
CREATE TYPE public.org_status AS ENUM ('pending','active','suspended','rejected');
CREATE TYPE public.org_member_status AS ENUM ('active','invited','suspended');
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','expired','cancelled');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected');

-- Superadmins table
CREATE TABLE public.superadmins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status public.org_status NOT NULL DEFAULT 'pending',
  plan text DEFAULT 'free',
  logo_url text,
  institution_email text,
  phone text,
  address text,
  commune text,
  region text,
  country text DEFAULT 'Chile',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'visor',
  status public.org_member_status NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Invitations
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'visor',
  invited_by uuid REFERENCES auth.users(id),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organization requests
CREATE TABLE public.organization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  organization_name text NOT NULL,
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  phone text,
  commune text,
  region text,
  message text,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_requests ENABLE ROW LEVEL SECURITY;

-- Default organization
INSERT INTO public.organizations (id, name, slug, status, country)
VALUES ('00000000-0000-0000-0000-000000000001','Organización Inicial','org-inicial','active','Chile');

-- Add organization_id to operational tables
ALTER TABLE public.emergencies ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.emergency_keys ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.emergency_vehicles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.emergency_personnel ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.emergency_log ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.vehicles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.volunteers ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.companies ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.ranks ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.equipment ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.hydrants ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.training ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.audit_log ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Backfill existing data
UPDATE public.emergencies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.emergency_keys SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.emergency_vehicles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.emergency_personnel SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.emergency_log SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.vehicles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.volunteers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.companies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.ranks SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.equipment SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.hydrants SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.training SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.audit_log SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Set NOT NULL
ALTER TABLE public.emergencies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emergency_keys ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emergency_vehicles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emergency_personnel ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emergency_log ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.volunteers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.companies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ranks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.equipment ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.hydrants ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.training ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.audit_log ALTER COLUMN organization_id SET NOT NULL;

-- Indexes
CREATE INDEX idx_emergencies_org ON public.emergencies(organization_id);
CREATE INDEX idx_emergency_keys_org ON public.emergency_keys(organization_id);
CREATE INDEX idx_emergency_vehicles_org ON public.emergency_vehicles(organization_id);
CREATE INDEX idx_emergency_personnel_org ON public.emergency_personnel(organization_id);
CREATE INDEX idx_emergency_log_org ON public.emergency_log(organization_id);
CREATE INDEX idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX idx_volunteers_org ON public.volunteers(organization_id);
CREATE INDEX idx_companies_org ON public.companies(organization_id);
CREATE INDEX idx_ranks_org ON public.ranks(organization_id);
CREATE INDEX idx_equipment_org ON public.equipment(organization_id);
CREATE INDEX idx_hydrants_org ON public.hydrants(organization_id);
CREATE INDEX idx_training_org ON public.training(organization_id);
CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);

-- Migrate user_roles to organization_members
INSERT INTO public.organization_members (organization_id, user_id, role, status)
SELECT '00000000-0000-0000-0000-000000000001', sub.user_id, sub.role::text::public.org_role, 'active'
FROM (
  SELECT DISTINCT ON (user_id) user_id, role
  FROM public.user_roles
  ORDER BY user_id, CASE role WHEN 'admin' THEN 1 WHEN 'oficial' THEN 2 WHEN 'operador' THEN 3 ELSE 4 END
) sub
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Make existing admins superadmins
INSERT INTO public.superadmins (user_id)
SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.get_my_organization_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND organization_id = _org_id AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _role public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND organization_id = _org_id AND role = _role AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.can_write_in_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND organization_id = _org_id AND status = 'active' AND role IN ('admin','operador','oficial'))
$$;

-- Drop ALL old RLS policies
DROP POLICY IF EXISTS "Admin/Oficial can delete volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Admin/Oficial can manage volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Authenticated can view volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Authenticated can view emergency_log" ON public.emergency_log;
DROP POLICY IF EXISTS "Operador+ can create emergency_log" ON public.emergency_log;
DROP POLICY IF EXISTS "Admin can manage hydrants" ON public.hydrants;
DROP POLICY IF EXISTS "Authenticated can view hydrants" ON public.hydrants;
DROP POLICY IF EXISTS "Admin/Oficial can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admin/Oficial can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admin can delete emergency keys" ON public.emergency_keys;
DROP POLICY IF EXISTS "Admin can manage emergency keys" ON public.emergency_keys;
DROP POLICY IF EXISTS "Authenticated can view emergency keys" ON public.emergency_keys;
DROP POLICY IF EXISTS "Admin can manage ranks" ON public.ranks;
DROP POLICY IF EXISTS "Authenticated can view ranks" ON public.ranks;
DROP POLICY IF EXISTS "Admin/Oficial can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated can view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated can view emergency_vehicles" ON public.emergency_vehicles;
DROP POLICY IF EXISTS "Operador+ can manage emergency_vehicles" ON public.emergency_vehicles;
DROP POLICY IF EXISTS "Admin/Oficial can manage training" ON public.training;
DROP POLICY IF EXISTS "Authenticated can view training" ON public.training;
DROP POLICY IF EXISTS "Admin can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can view emergency_personnel" ON public.emergency_personnel;
DROP POLICY IF EXISTS "Operador+ can manage emergency_personnel" ON public.emergency_personnel;
DROP POLICY IF EXISTS "Authenticated can view emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "Operador+ can create emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "Operador+ can update emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON public.audit_log;

-- New RLS policies
-- superadmins
CREATE POLICY "sa_select" ON public.superadmins FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_superadmin());
CREATE POLICY "sa_manage" ON public.superadmins FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- organizations
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated USING (is_superadmin() OR id IN (SELECT get_my_organization_ids()));
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (is_superadmin());
CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(id, 'admin'));
CREATE POLICY "org_delete" ON public.organizations FOR DELETE TO authenticated USING (is_superadmin());

-- organization_members
CREATE POLICY "om_select" ON public.organization_members FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "om_insert" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "om_update" ON public.organization_members FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "om_delete" ON public.organization_members FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- invitations
CREATE POLICY "inv_select" ON public.organization_invitations FOR SELECT TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "inv_insert" ON public.organization_invitations FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "inv_update" ON public.organization_invitations FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "inv_delete" ON public.organization_invitations FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- requests
CREATE POLICY "req_select" ON public.organization_requests FOR SELECT TO authenticated USING (is_superadmin() OR user_id = auth.uid());
CREATE POLICY "req_insert" ON public.organization_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "req_update" ON public.organization_requests FOR UPDATE TO authenticated USING (is_superadmin());

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (is_superadmin());

-- user_roles
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_superadmin());
CREATE POLICY "ur_manage" ON public.user_roles FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- volunteers
CREATE POLICY "vol_select" ON public.volunteers FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "vol_insert" ON public.volunteers FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "vol_update" ON public.volunteers FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "vol_delete" ON public.volunteers FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- vehicles
CREATE POLICY "veh_select" ON public.vehicles FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "veh_insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "veh_update" ON public.vehicles FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "veh_delete" ON public.vehicles FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- companies
CREATE POLICY "comp_select" ON public.companies FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "comp_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "comp_update" ON public.companies FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "comp_delete" ON public.companies FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- emergencies
CREATE POLICY "emg_select" ON public.emergencies FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "emg_insert" ON public.emergencies FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "emg_update" ON public.emergencies FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));

-- emergency_keys
CREATE POLICY "ek_select" ON public.emergency_keys FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "ek_insert" ON public.emergency_keys FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "ek_update" ON public.emergency_keys FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "ek_delete" ON public.emergency_keys FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- emergency_vehicles
CREATE POLICY "ev_select" ON public.emergency_vehicles FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "ev_insert" ON public.emergency_vehicles FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "ev_update" ON public.emergency_vehicles FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));

-- emergency_personnel
CREATE POLICY "ep_select" ON public.emergency_personnel FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "ep_insert" ON public.emergency_personnel FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "ep_update" ON public.emergency_personnel FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));

-- emergency_log
CREATE POLICY "el_select" ON public.emergency_log FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "el_insert" ON public.emergency_log FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));

-- ranks
CREATE POLICY "rank_select" ON public.ranks FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "rank_insert" ON public.ranks FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "rank_update" ON public.ranks FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "rank_delete" ON public.ranks FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- equipment
CREATE POLICY "eq_select" ON public.equipment FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "eq_insert" ON public.equipment FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "eq_update" ON public.equipment FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "eq_delete" ON public.equipment FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- hydrants
CREATE POLICY "hyd_select" ON public.hydrants FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "hyd_insert" ON public.hydrants FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "hyd_update" ON public.hydrants FOR UPDATE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));
CREATE POLICY "hyd_delete" ON public.hydrants FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- training
CREATE POLICY "trn_select" ON public.training FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "trn_insert" ON public.training FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "trn_update" ON public.training FOR UPDATE TO authenticated USING (is_superadmin() OR can_write_in_org(organization_id));
CREATE POLICY "trn_delete" ON public.training FOR DELETE TO authenticated USING (is_superadmin() OR has_org_role(organization_id, 'admin'));

-- audit_log
CREATE POLICY "aud_select" ON public.audit_log FOR SELECT TO authenticated USING (is_superadmin() OR organization_id IN (SELECT get_my_organization_ids()));
CREATE POLICY "aud_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (is_superadmin() OR is_org_member(organization_id));

-- Triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
