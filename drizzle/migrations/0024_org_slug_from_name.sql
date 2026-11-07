CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS legacy_slugs text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.org_slug_from_name(_name text, _exclude uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  base := lower(extensions.unaccent(coalesce(_name, '')));
  base := regexp_replace(base, '^(cuerpo de bomberos( de)?|cb)\s+', '');
  base := trim(both '-' from regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
  IF base = '' THEN base := 'cuerpo'; END IF;
  base := left(base, 60);
  cand := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations o WHERE (o.slug = cand OR cand = ANY(o.legacy_slugs)) AND o.id IS DISTINCT FROM _exclude) LOOP
    n := n + 1; cand := base || '-' || n;
  END LOOP;
  RETURN cand;
END $$;

UPDATE public.organizations o SET
  legacy_slugs = array_append(o.legacy_slugs, o.slug),
  slug = public.org_slug_from_name(o.name, o.id)
WHERE o.slug IS DISTINCT FROM public.org_slug_from_name(o.name, o.id);

CREATE OR REPLACE FUNCTION public.organizations_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s text;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.name IS DISTINCT FROM OLD.name THEN
    s := public.org_slug_from_name(NEW.name, NEW.id);
    IF TG_OP = 'UPDATE' AND OLD.slug IS NOT NULL AND OLD.slug <> s AND NOT (OLD.slug = ANY(NEW.legacy_slugs)) THEN
      NEW.legacy_slugs := array_append(NEW.legacy_slugs, OLD.slug);
    END IF;
    NEW.slug := s;
  ELSE
    NEW.slug := OLD.slug;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS organizations_set_slug ON public.organizations;
CREATE TRIGGER organizations_set_slug BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.organizations_set_slug();