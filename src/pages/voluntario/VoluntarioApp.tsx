
import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import { FeedbackSurvey } from './FeedbackSurvey';
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
import VoluntarioMap from './VoluntarioMap';

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import {
  ensureVolunteerServiceWorker,
  listenForeground,
  registerVolunteerPush,
} from '@/services/fcmWebPush';

import { playDefaultDispatchTone } from '@/services/defaultDispatchTone';
import { toast } from 'sonner';

import {
  pickVolunteerMembership,
  volunteerRecordBlock,
  NO_ORG_MESSAGE,
} from '@/lib/volunteerAccess';

// Lazy loading: evita cargar el módulo de guardias hasta que sea necesario.
const CompanyDuty = lazy(() => import('@/pages/CompanyDuty'));

interface VolunteerMembership {
  organization_id: string;
  org_name: string;
  org_status: string;
  org_logo_url: string | null;
  pwa_enabled: boolean;
  volunteer_active: boolean;
}

function isValidCachedMembership(
  value: unknown,
): value is VolunteerMembership {
  if (typeof value !== 'object' || value === null) return false;

  const membership = value as Partial<VolunteerMembership>;

  return (
    typeof membership.organization_id === 'string' &&
    membership.organization_id.length > 0 &&
    typeof membership.org_name === 'string' &&
    typeof membership.pwa_enabled === 'boolean' &&
    typeof membership.volunteer_active === 'boolean'
  );
}

export default function VoluntarioApp() {
  const {
    user,
    loading,
    isPendingValidation,
    retryValidation,
    signOut,
  } = useAuth();

  const nav = useNavigate();

  const [checking, setChecking] = useState(true);
  const [membership, setMembership] =
    useState<VolunteerMembership | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mantiene el PWA de voluntarios bajo su propio Service Worker.
  useEffect(() => {
    ensureVolunteerServiceWorker().catch(() => {});
  }, []);

  // Carga y valida la membresía del voluntario.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setMembership(null);
      setChecking(false);
      return;
    }

    let cancelled = false;

    const loadMembership = async () => {
      setChecking(true);
      setError(null);

      try {
        const { data, error: err } = await (supabase as any)
          .from('organization_members')
          .select(
            'organization_id, role, status, organizations(id, name, status, logo_url)',
          )
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (cancelled) return;

        // Recuperación offline: solo para restaurar la interfaz.
        // Las operaciones protegidas deben seguir validándose en Supabase.
        if (err) {
          const errorMessage = String(
            err.message ?? err,
          ).toLowerCase();

          const isNetworkError =
            /fetch|network|failed to fetch|timeout|offline|internet|load failed/.test(
              errorMessage,
            );

          if (isNetworkError && Capacitor.isNativePlatform()) {
            try {
              const { value } = await Preferences.get({
                key: `operix_vol_membership_${user.id}`,
              });

              if (cancelled) return;

              if (value) {
                const cachedMembership: unknown = JSON.parse(value);

                if (isValidCachedMembership(cachedMembership)) {
                  console.info(
                    '[Offline] Restoring cached volunteer membership',
                  );

                  setMembership(cachedMembership);
                  setError(null);
                  setChecking(false);
                  return;
                }
              }
            } catch (prefErr) {
              console.warn(
                '[Offline] Could not read cached membership:',
                prefErr,
              );
            }
          }

          setError(err.message);
          setChecking(false);
          return;
        }

        // Validación oficial de membresía desde GitHub/Supabase.
        const m = pickVolunteerMembership(data);

        if (!m) {
          setError(NO_ORG_MESSAGE);
          setChecking(false);
          return;
        }

        // Verifica el registro del voluntario.
        const { data: vol, error: volunteerError } = await (supabase as any)
          .from('volunteers')
          .select('pwa_enabled, status')
          .eq('user_id', user.id)
          .eq('organization_id', m.organization_id)
          .maybeSingle();

        if (cancelled) return;

        if (volunteerError) {
          setError(volunteerError.message);
          setChecking(false);
          return;
        }

        // Conserva las restricciones de acceso existentes.
        const block = volunteerRecordBlock(m.role, vol);

        if (block) {
          setError(block);
          setChecking(false);
          return;
        }

        const newMembership: VolunteerMembership = {
          organization_id: m.organization_id,
          org_name: m.organizations?.name ?? '',
          org_status: m.organizations?.status ?? '',
          org_logo_url: m.organizations?.logo_url ?? null,
          pwa_enabled: vol?.pwa_enabled ?? true,
          volunteer_active: vol?.status === 'activo' || !vol,
        };

        // Guarda la última membresía válida para recuperación offline.
        if (Capacitor.isNativePlatform()) {
          await Preferences.set({
            key: `operix_vol_membership_${user.id}`,
            value: JSON.stringify(newMembership),
          }).catch((storageError) => {
            console.warn(
              '[Offline] Could not save membership:',
              storageError,
            );
          });
        }

        if (cancelled) return;

        setMembership(newMembership);
        setError(null);
        setChecking(false);
      } catch (unexpectedError) {
        if (cancelled) return;

        console.error(
          '[Volunteer] Membership loading error:',
          unexpectedError,
        );

        setError(
          unexpectedError instanceof Error
            ? unexpectedError.message
            : 'No fue posible cargar la información del voluntario.',
        );

        setChecking(false);
      }
    };

    loadMembership();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  // Registro de notificaciones push web.
  useEffect(() => {
    if (!user || !membership) return;

    // En Android, el registro nativo se administra desde App.tsx.
    if (Capacitor.isNativePlatform()) return;

    registerVolunteerPush(
      membership.organization_id,
      user.id,
    ).catch((err) => {
      console.warn('[Push] Web registration error:', err);
    });

    const unsub = listenForeground((p) => {
      playDefaultDispatchTone();

      toast(p.title || 'Nueva emergencia', {
        description: p.body,
        action: p.emergency_id
          ? {
              label: 'Ver',
              onClick: () =>
                nav(`/voluntario/emergencia/${p.emergency_id}`),
            }
          : undefined,
      });
    });

    // Mensajes del Service Worker.
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'operix-play-dispatch-tone') {
        playDefaultDispatchTone();
      }
    };

    navigator.serviceWorker?.addEventListener(
      'message',
      onSwMessage,
    );

    // Reproduce el tono si se abrió desde una notificación.
    try {
      const url = new URL(window.location.href);

      if (url.searchParams.get('playTone') === '1') {
        playDefaultDispatchTone();

        url.searchParams.delete('playTone');

        window.history.replaceState(
          {},
          '',
          url.toString(),
        );
      }
    } catch {
      // Ignorar errores de URL.
    }

    return () => {
      unsub();

      navigator.serviceWorker?.removeEventListener(
        'message',
        onSwMessage,
      );
    };
  }, [user, membership, nav]);

  // Pantalla de carga.
  if (loading || checking) {
    return (
      <VoluntarioLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emergency" />
        </div>
      </VoluntarioLayout>
    );
  }

  // Sesión pendiente de validación.
  if (isPendingValidation && !user) {
    return (
      <VoluntarioLayout>
        <div className="flex flex-col min-h-screen items-center justify-center p-6 space-y-4 text-center">
          <AlertTriangle className="h-10 w-10 text-warning" />

          <h2 className="text-lg font-semibold">
            Validación pendiente
          </h2>

          <p className="text-sm text-muted-foreground">
            Se encontraron credenciales guardadas, pero no hay conexión
            a internet para verificarlas en este momento.
          </p>

          <div className="flex flex-col w-full max-w-xs space-y-2 mt-4">
            <Button onClick={retryValidation}>
              Reintentar conexión
            </Button>

            <Button variant="outline" onClick={signOut}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </VoluntarioLayout>
    );
  }

  // Usuario sin sesión.
  if (!user) {
    return (
      <VoluntarioLayout>
        <Routes>
          <Route
            path="/login"
            element={<VoluntarioLogin />}
          />

          <Route
            path="*"
            element={<Navigate to="/voluntario/login" replace />}
          />
        </Routes>
      </VoluntarioLayout>
    );
  }

  // Error de membresía o ausencia de organización.
  if (error || !membership) {
    return (
      <VoluntarioLayout>
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-warning" />

            <p className="text-sm text-foreground">
              {error || NO_ORG_MESSAGE}
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const { supabase } = await import(
                  '@/integrations/supabase/client'
                );

                const { clearNativeAuthSession } = await import(
                  '@/services/nativeAuthStorage'
                );

                await supabase.auth.signOut();
                await clearNativeAuthSession();
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </VoluntarioLayout>
    );
  }

  // Aplicación principal del voluntario.
  return (
    <VoluntarioLayout
      orgName={membership.org_name}
      orgLogoUrl={membership.org_logo_url}
    >
      <FeedbackSurvey />

      <Routes>
        <Route
          index
          element={
            <VoluntarioFeed
              organizationId={membership.organization_id}
              orgName={membership.org_name}
              orgLogoUrl={membership.org_logo_url}
            />
          }
        />

        <Route
          path="historial"
          element={
            <VoluntarioHistory
              organizationId={membership.organization_id}
            />
          }
        />

        <Route
          path="guardias"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emergency" />
                </div>
              }
            >
              <CompanyDuty personal />
            </Suspense>
          }
        />

        <Route
          path="mapa"
          element={<VoluntarioMap />}
        />

        <Route
          path="perfil"
          element={
            <VoluntarioProfile
              organizationId={membership.organization_id}
              orgName={membership.org_name}
            />
          }
        />

        <Route
          path="emergencia/:id"
          element={
            <VoluntarioDetail
              organizationId={membership.organization_id}
              orgName={membership.org_name}
              orgLogoUrl={membership.org_logo_url}
            />
          }
        />

        <Route
          path="login"
          element={<Navigate to="/voluntario" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/voluntario" replace />}
        />
      </Routes>
    </VoluntarioLayout>
  );
}
