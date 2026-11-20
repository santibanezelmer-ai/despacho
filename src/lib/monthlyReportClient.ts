import { supabase } from '@/integrations/supabase/client';
import { recipientAllowed, previousMonth, periodBounds } from '../../supabase/functions/_shared/monthly-report';
import { loadReport } from '../../supabase/functions/_shared/report-data';
export { previousMonth, periodBounds };
export async function readMonthlyReport(orgId: string, period: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Inicia sesión para consultar el reporte');
  const { data: members, error: membershipError } = await supabase.from('organization_members').select('role,status').eq('organization_id', orgId).eq('user_id', data.user.id).eq('status', 'active');
  if (membershipError) throw membershipError;
  if (!members?.some(recipientAllowed)) throw new Error('Acceso solo para administradores y oficiales activos');
  // Uses the signed-in client and existing RLS; no deployed function needed for preview.
  return loadReport(supabase, orgId, period);
}
