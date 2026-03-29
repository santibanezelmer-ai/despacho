
-- =============================================
-- CENTRAL DE BOMBEROS v4.0 - DATABASE SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'oficial', 'visor');
CREATE TYPE public.emergency_status AS ENUM ('despacho', 'en_ruta', 'en_trabajo', 'controlada', 'finalizada');
CREATE TYPE public.vehicle_status AS ENUM ('disponible', 'en_servicio', 'mantencion', 'fuera_servicio');
CREATE TYPE public.volunteer_status AS ENUM ('activo', 'inactivo', 'licencia');

-- 2. UTILITY FUNCTION: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- 5. COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number INT NOT NULL,
  address TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RANKS
CREATE TABLE public.ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;

-- 7. VOLUNTEERS
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rut TEXT UNIQUE,
  rank_id UUID REFERENCES public.ranks(id),
  company_id UUID REFERENCES public.companies(id),
  phone TEXT,
  email TEXT,
  status volunteer_status NOT NULL DEFAULT 'activo',
  available BOOLEAN NOT NULL DEFAULT true,
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  type TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 6,
  status vehicle_status NOT NULL DEFAULT 'disponible',
  year INT,
  plate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. EMERGENCY KEYS
CREATE TABLE public.emergency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#dc2626',
  sort_order INT NOT NULL DEFAULT 0,
  tone_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_emergency_keys_updated_at BEFORE UPDATE ON public.emergency_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. EMERGENCIES
CREATE TABLE public.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL UNIQUE,
  emergency_key_id UUID REFERENCES public.emergency_keys(id) NOT NULL,
  address TEXT NOT NULL,
  reference TEXT,
  caller_name TEXT,
  caller_phone TEXT,
  observations TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status emergency_status NOT NULL DEFAULT 'despacho',
  created_by UUID REFERENCES auth.users(id),
  dispatched_at TIMESTAMPTZ DEFAULT now(),
  en_route_at TIMESTAMPTZ,
  working_at TIMESTAMPTZ,
  controlled_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  pre_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_emergencies_updated_at BEFORE UPDATE ON public.emergencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. EMERGENCY VEHICLES
CREATE TABLE public.emergency_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES public.emergencies(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  odometer_start INT,
  odometer_end INT
);

ALTER TABLE public.emergency_vehicles ENABLE ROW LEVEL SECURITY;

-- 12. EMERGENCY PERSONNEL
CREATE TABLE public.emergency_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES public.emergencies(id) ON DELETE CASCADE NOT NULL,
  emergency_vehicle_id UUID REFERENCES public.emergency_vehicles(id),
  volunteer_id UUID REFERENCES public.volunteers(id) NOT NULL,
  role TEXT DEFAULT 'voluntario',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_personnel ENABLE ROW LEVEL SECURITY;

-- 13. EMERGENCY LOG
CREATE TABLE public.emergency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES public.emergencies(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_log ENABLE ROW LEVEL SECURITY;

-- 14. HYDRANTS
CREATE TABLE public.hydrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  type TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hydrants ENABLE ROW LEVEL SECURITY;

-- 15. EQUIPMENT
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'bueno',
  last_check TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. TRAINING
CREATE TABLE public.training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE NOT NULL,
  course_name TEXT NOT NULL,
  certification TEXT,
  date_completed DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training ENABLE ROW LEVEL SECURITY;

-- 17. AUDIT LOG
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 18. FOLIO SEQUENCE
CREATE SEQUENCE public.emergency_folio_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_emergency_folio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := 'EMG-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.emergency_folio_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_emergency_folio
  BEFORE INSERT ON public.emergencies
  FOR EACH ROW EXECUTE FUNCTION public.generate_emergency_folio();

-- =============================================
-- RLS POLICIES
-- =============================================

CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view ranks" ON public.ranks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage ranks" ON public.ranks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view volunteers" ON public.volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Oficial can manage volunteers" ON public.volunteers FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Oficial can manage vehicles" ON public.vehicles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view emergency keys" ON public.emergency_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage emergency keys" ON public.emergency_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view emergencies" ON public.emergencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ can create emergencies" ON public.emergencies FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'));
CREATE POLICY "Operador+ can update emergencies" ON public.emergencies FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view emergency_vehicles" ON public.emergency_vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ can manage emergency_vehicles" ON public.emergency_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view emergency_personnel" ON public.emergency_personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ can manage emergency_personnel" ON public.emergency_personnel FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view emergency_log" ON public.emergency_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ can create emergency_log" ON public.emergency_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view hydrants" ON public.hydrants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage hydrants" ON public.hydrants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view equipment" ON public.equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Oficial can manage equipment" ON public.equipment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Authenticated can view training" ON public.training FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Oficial can manage training" ON public.training FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficial'));

CREATE POLICY "Admin can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('tones', 'tones', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Tones are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'tones');
CREATE POLICY "Admin can upload tones" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tones' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete tones" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tones' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Operador+ can upload documents" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador') OR public.has_role(auth.uid(), 'oficial')));
