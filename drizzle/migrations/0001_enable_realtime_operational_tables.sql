-- Habilita Realtime para los estados operativos usados por la Consola de Despacho.
-- No modifica columnas, relaciones ni políticas existentes.
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.volunteers REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vehicles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'volunteers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emergencies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emergency_vehicles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_vehicles;
  END IF;
END $$;