import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoluntarioLayout from './VoluntarioLayout';
import VoluntarioLogin from './VoluntarioLogin';
import VoluntarioFeed from './VoluntarioFeed';
import VoluntarioDetail from './VoluntarioDetail';
import VoluntarioHistory from './VoluntarioHistory';
import VoluntarioProfile from './VoluntarioProfile';
import { listenForeground, registerVolunteerPush } from '@/services/fcmWebPush';
import { toast } from 'sonner';

interface VolunteerMembership {
  organization_id: string;
  org_name: string;
  org_status: string;
  pwa_enabled: boolean;
  volunteer_active: boolean;
}

export default function VoluntarioApp() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [membership, setMembership] = useState<VolunteerMembership | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); return; }

    (async () => {
      setChecking(true);
      const { data, error: err } = await (supabase as any)
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, status)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('role', 'voluntario');

      if (err) { setError(err.message); setChecking(false); return; }
      if (!data?.length) {
        setError('Esta cuenta no tiene acceso de voluntario. Pídele a tu administrador que te invite.');
        setChecking(false);
        return;
      }

      const m = data[0];
      const { data: vol } = await (supabase as any)
        .from('volunteers')
        .select('pwa_enabled, status')
        .eq('user_id', user.id)
        .eq('organization_id', m.organization_id)
        .maybeSingle();

      if (vol && (vol.pwa_enabled === false || vol.status !== 'activo')) {
        setError('Tu acceso a la app está deshabilitado. Contacta a tu administrador.');
        setChecking(false);
        return;
      }

      setMembership({
        organization_id: m.organization_id,
        org_name: m.organizations?.name ?? '',
        org_status: m.organizations?.status ?? '',
        pwa_enabled: vol?.pwa_enabled ?? true,
        volunteer_active: vol?.status === 'activo' || !vol,
      });
      setError(null);
      setChecking(false);
    })();
  }, [user, loading]);

  // Auto-register push when membership loads
  useEffect(() => {
    if (!user || !membership) return;
    registerVolunteerPush(membership.organization_id, user.id).catch(() => {});
    const unsub = listenForeground((p) => {
      toast(p.title || 'Nueva emergencia', {
        description: p.body,
        action: p.emergency_id
          ? { label: 'Ver', onClick: () => nav(`/voluntario/emergencia/${p.emergency_id}`) }
          : undefined,
      });
    });
    return () => { unsub(); };
  }, [user, membership, nav]);

  if (loading || checking) {
    return (
      <VoluntarioLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emergency" /></div>
      </VoluntarioLayout>
    );
  }

  if (!user) {
    return (
      <VoluntarioLayout>
        <Routes>
          <Route path="/login" element={<VoluntarioLogin />} />
          <Route path="*" element={<Navigate to="/voluntario/login" replace />} />
        </Routes>
      </VoluntarioLayout>
    );
  }

  if (error || !membership) {
    return (
      <VoluntarioLayout>
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
            <p className="text-sm text-foreground">{error}</p>
            <Button variant="outline" className="w-full" onClick={async () => { const { supabase } = await import('@/integrations/supabase/client'); await supabase.auth.signOut(); }}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </VoluntarioLayout>
    );
  }

  return (
    <VoluntarioLayout>
      <Routes>
        <Route index element={<VoluntarioFeed organizationId={membership.organization_id} />} />
        <Route path="historial" element={<VoluntarioHistory organizationId={membership.organization_id} />} />
        <Route path="perfil" element={<VoluntarioProfile organizationId={membership.organization_id} orgName={membership.org_name} />} />
        <Route path="emergencia/:id" element={<VoluntarioDetail organizationId={membership.organization_id} />} />
        <Route path="login" element={<Navigate to="/voluntario" replace />} />
        <Route path="*" element={<Navigate to="/voluntario" replace />} />
      </Routes>
    </VoluntarioLayout>
  );
}
