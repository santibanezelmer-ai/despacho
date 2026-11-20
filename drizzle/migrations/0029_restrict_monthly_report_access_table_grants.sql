REVOKE ALL ON TABLE public.monthly_report_snapshots, public.monthly_report_access_tokens, public.monthly_report_access_audit, public.monthly_report_access_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.monthly_report_snapshots, public.monthly_report_access_tokens, public.monthly_report_access_audit, public.monthly_report_access_limits TO service_role;
REVOKE ALL ON FUNCTION public.monthly_report_history_immutable(), public.monthly_report_token_dates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_report_history_immutable(), public.monthly_report_token_dates() TO service_role;
