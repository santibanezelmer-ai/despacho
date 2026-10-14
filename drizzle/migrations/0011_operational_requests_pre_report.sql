ALTER TABLE public.vehicle_operational_requests ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.vehicle_operational_requests DROP CONSTRAINT IF EXISTS vor_requested_status_chk;
ALTER TABLE public.vehicle_operational_requests ADD CONSTRAINT vor_requested_status_chk CHECK (requested_status IN ('6-3','6-8','6-9','6-10','PRE-INFORME'));
ALTER TABLE public.vehicle_operational_requests ADD CONSTRAINT vor_message_len_chk CHECK (message IS NULL OR char_length(message) <= 4000);