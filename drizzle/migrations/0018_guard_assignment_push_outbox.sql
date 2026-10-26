CREATE FUNCTION public.guard_enqueue_assignment_push(_assignment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.guard_assignments; s public.guard_shifts; uid uuid; cname text;
BEGIN
 SELECT * INTO a FROM public.guard_assignments WHERE id=_assignment;
 IF NOT FOUND OR a.status<>'propuesto' THEN RETURN; END IF;
 SELECT * INTO s FROM public.guard_shifts WHERE id=a.shift_id;
 IF s.status<>'publicado' THEN RETURN; END IF;
 SELECT v.user_id INTO uid FROM public.volunteers v WHERE v.id=a.volunteer_id AND v.organization_id=a.organization_id AND v.company_id=a.company_id;
 IF uid IS NULL THEN RETURN; END IF;
 SELECT name INTO cname FROM public.companies WHERE id=a.company_id AND organization_id=a.organization_id;
 INSERT INTO public.guard_notification_outbox(organization_id,company_id,event_key,recipient_id,shift_id,payload)
 VALUES(a.organization_id,a.company_id,'guard_assignment:'||a.id::text,uid,a.shift_id,
  jsonb_build_object('assignment_id',a.id,'company_name',coalesce(cname,'Compañía'),'shift_name',s.name,'starts_at',a.starts_at,'ends_at',a.ends_at))
 ON CONFLICT (event_key,recipient_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.guard_enqueue_assignment_push(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_assignment_push_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r record;
BEGIN
 IF TG_TABLE_NAME='guard_assignments' THEN
  PERFORM public.guard_enqueue_assignment_push(NEW.id);
 ELSIF NEW.status='publicado' AND OLD.status IS DISTINCT FROM 'publicado' THEN
  FOR r IN SELECT id FROM public.guard_assignments WHERE shift_id=NEW.id AND status='propuesto' LOOP
   PERFORM public.guard_enqueue_assignment_push(r.id);
  END LOOP;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.guard_assignment_push_trg() FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER guard_assignments_push AFTER INSERT ON public.guard_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_push_trg();
CREATE TRIGGER guard_shifts_publish_push AFTER UPDATE OF status ON public.guard_shifts FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_push_trg();

GRANT UPDATE (status,attempts,next_attempt_at) ON public.guard_notification_outbox TO service_role;