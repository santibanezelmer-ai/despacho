-- REVIEW ONLY. Add after the existing v3 01/02/03; never apply automatically.
-- Invoker wrapper: delegates authorization, locking, constraints and audit to v3.
-- One RPC statement = one transaction. No exception handler or compensating delete.
CREATE FUNCTION public.guard_create_draft(
 _org uuid, _company uuid, _name text, _start timestamptz,
 _end timestamptz, _mode text, _slots jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE sid uuid; slot jsonb;
BEGIN
 IF _slots IS NULL OR jsonb_typeof(_slots)<>'array' THEN
  RAISE EXCEPTION 'slots array required' USING ERRCODE='22023';
 END IF;
 -- Same batch limit as guard_replace_shift, not a new business limit.
 IF jsonb_array_length(_slots) NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'invalid slots count' USING ERRCODE='22023';
 END IF;
 sid := public.guard_create_shift(_org,_company,_name,_start,_end,_mode);
 FOR slot IN SELECT value FROM jsonb_array_elements(_slots) LOOP
  IF jsonb_typeof(slot)<>'object' THEN
   RAISE EXCEPTION 'slot object required' USING ERRCODE='22023';
  END IF;
  IF NOT (slot ?& ARRAY['role','mode','start','end','capacity','critical','specialties'])
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(slot) k
             WHERE k NOT IN ('role','mode','start','end','capacity','critical','specialties'))
   OR jsonb_typeof(slot->'role') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'mode') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'start') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'end') IS DISTINCT FROM 'string'
   OR jsonb_typeof(slot->'capacity') IS DISTINCT FROM 'number'
   OR jsonb_typeof(slot->'critical') IS DISTINCT FROM 'boolean'
   OR jsonb_typeof(slot->'specialties') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'invalid slot specification' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(slot->'specialties') v
            WHERE jsonb_typeof(v) IS DISTINCT FROM 'string') THEN
   RAISE EXCEPTION 'invalid specialties' USING ERRCODE='22023';
  END IF;
  PERFORM public.guard_create_slot(_org,sid,slot->>'role',slot->>'mode',
   (slot->>'start')::timestamptz,(slot->>'end')::timestamptz,
   (slot->>'capacity')::integer,(slot->>'critical')::boolean,
   ARRAY(SELECT jsonb_array_elements_text(slot->'specialties')));
 END LOOP;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.guard_create_draft(uuid,uuid,text,timestamptz,timestamptz,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,sandbox_exec;
GRANT EXECUTE ON FUNCTION public.guard_create_draft(uuid,uuid,text,timestamptz,timestamptz,text,jsonb)
 TO authenticated;