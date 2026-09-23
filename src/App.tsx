import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider, useOrganizationOptional } from "@/contexts/OrganizationContext";
import RouteErrorBoundary from "@/components/error/RouteErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterOrganization from "@/pages/RegisterOrganization";
import PendingApproval from "@/pages/PendingApproval";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvitation from "@/pages/AcceptInvitation";
import DispatchConsole from "@/pages/DispatchConsole";
import ActiveEmergencies from "@/pages/ActiveEmergencies";
import DispatchNotes from "@/pages/DispatchNotes";
import EmergencyHistory from "@/pages/EmergencyHistory";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
import Volunteers from "@/pages/Volunteers";
import Vehicles from "@/pages/Vehicles";
import Companies from "@/pages/Companies";
import EmergencyKeysAdmin from "@/pages/EmergencyKeysAdmin";
import PlaceholderPage from "@/components/shared/PlaceholderPage";
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const OperativeMap = lazy(() => import("@/pages/OperativeMap"));
const EquipmentPage = lazy(() => import("@/pages/Equipment"));
const CentralScreen = lazy(() => import("@/pages/CentralScreen"));
const MapScreen = lazy(() => import("@/pages/MapScreen"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const SimulationPage = lazy(() => import("@/pages/SimulationPage"));
const TrainingPage = lazy(() => import("@/pages/TrainingPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const ExportsPage = lazy(() => import("@/pages/ExportsPage"));
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import SuperadminLayout from "@/pages/superadmin/SuperadminLayout";
import SuperadminDashboard from "@/pages/superadmin/SuperadminDashboard";
import SuperadminOrganizations from "@/pages/superadmin/SuperadminOrganizations";
import SuperadminRequests from "@/pages/superadmin/SuperadminRequests";
import SuperadminSupport from "@/pages/superadmin/SuperadminSupport";
import SupportPage from "@/pages/SupportPage";
import NotFound from "./pages/NotFound";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileFeedPage from "@/pages/mobile/MobileFeedPage";
import MobileEmergencyDetailPage from "@/pages/mobile/MobileEmergencyDetailPage";
import MobileProfilePage from "@/pages/mobile/MobileProfilePage";
const MobileMapPage = lazy(() => import("@/pages/mobile/MobileMapPage"));
import OnboardingPage from "@/pages/admin/OnboardingPage";
import VoluntarioApp from "@/pages/voluntario/VoluntarioApp";
import SharedLocationPage from "@/pages/SharedLocationPage";
import TermsPage from "@/pages/legal/TermsPage";
import { Loader2 } from "lucide-react";
import { useIsNativeMobile } from "@/hooks/useIsNativeMobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import SecurityGuard from "@/components/security/SecurityGuard";
import UserWatermark from "@/components/security/UserWatermark";
import { canAccessPath, defaultPathFor } from "@/lib/rolePermissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evitar refetch/re-render al cambiar de pestaña o volver al navegador.
      // Las vistas operativas ya usan polling con intervalos propios.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-emergency" />
    </div>
  );
}

function AppRoutes() {
  const { user, loading: authLoading, isSuperadmin } = useAuth();
  const orgCtx = useOrganizationOptional();
  const location = useLocation();
  const isNativeMobile = useIsNativeMobile();

  // Init push notifications for any authenticated native user
  usePushNotifications();

  // Fallback: if OrganizationProvider isn't mounted yet (or this tree was
  // rendered outside it), show a loading screen instead of throwing.
  if (!orgCtx) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emergency" />
      </div>
    );
  }

  const { orgId, currentOrg, loading: orgLoading, memberships } = orgCtx;

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emergency" />
      </div>
    );
  }

  if (!user) {
    // On native/mobile, skip landing and go straight to login
    if (isNativeMobile && location.pathname === '/') {
      return <Navigate to="/login" replace />;
    }
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterOrganization />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<AcceptInvitation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Authenticated user on native/mobile hitting a non-mobile route → redirect to mobile feed
  if (isNativeMobile && !location.pathname.startsWith('/mobile') && location.pathname !== '/pantalla-central' && !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/mobile/feed" replace />;
  }

  if (location.pathname === '/pantalla-central') {
    return (
      <Suspense fallback={<PageFallback />}>
        <CentralScreen />
      </Suspense>
    );
  }

  if (location.pathname === '/pantalla-mapa') {
    return (
      <Suspense fallback={<PageFallback />}>
        <MapScreen />
      </Suspense>
    );
  }

  if (location.pathname.startsWith('/superadmin')) {
    if (!isSuperadmin) return <Navigate to="/" replace />;
    return (
      <SuperadminLayout>
        <Routes>
          <Route path="/superadmin" element={<SuperadminDashboard />} />
          <Route path="/superadmin/organizaciones" element={<SuperadminOrganizations />} />
          <Route path="/superadmin/solicitudes" element={<SuperadminRequests />} />
          <Route path="/superadmin/soporte" element={<SuperadminSupport />} />
          <Route path="*" element={<Navigate to="/superadmin" replace />} />
        </Routes>
      </SuperadminLayout>
    );
  }

  // If user is voluntario-only (no admin/operador/oficial/visor membership), redirect to /voluntario
  const nonVolunteerMemberships = memberships.filter(m => m.role !== 'voluntario' && m.role !== 'visor');
  if (memberships.length > 0 && nonVolunteerMemberships.length === 0 && !isSuperadmin) {
    return <Navigate to="/voluntario" replace />;
  }

  if (memberships.length === 0 && !isSuperadmin) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<PendingApproval />} />
      </Routes>
    );
  }

  if (memberships.length === 0 && isSuperadmin) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/superadmin" replace />} />
      </Routes>
    );
  }

  if (currentOrg && currentOrg.organization?.status !== 'active') {
    return (
      <Routes>
        <Route path="*" element={<PendingApproval />} />
      </Routes>
    );
  }

  // Mobile routes
  if (location.pathname.startsWith('/mobile')) {
    return (
      <MobileLayout>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/mobile" element={<MobileFeedPage />} />
          <Route path="/mobile/feed" element={<MobileFeedPage />} />
          <Route path="/mobile/emergency/:id" element={<MobileEmergencyDetailPage />} />
          <Route path="/mobile/profile" element={<MobileProfilePage />} />
          <Route path="/mobile/map" element={<MobileMapPage />} />
          <Route path="*" element={<Navigate to="/mobile/feed" replace />} />
        </Routes>
        </Suspense>
      </MobileLayout>
    );
  }

  // Restricciones por rol (admin de compañía / operador)
  const accessCtx = {
    orgRole: orgCtx.orgRole,
    isCompanyAdmin: orgCtx.isCompanyAdmin,
    isSuperadmin,
  };
  if (!canAccessPath(location.pathname, accessCtx)) {
    return <Navigate to={defaultPathFor(accessCtx)} replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<DispatchConsole />} />
        <Route path="/emergencias" element={<ActiveEmergencies />} />
        <Route path="/comunicados" element={<DispatchNotes />} />
        <Route path="/historial" element={<EmergencyHistory />} />
        <Route path="/mapa" element={<OperativeMap />} />
        <Route path="/voluntarios" element={<Volunteers />} />
        <Route path="/moviles" element={<Vehicles />} />
        <Route path="/companias" element={<Companies />} />
        <Route path="/claves" element={<EmergencyKeysAdmin />} />
        <Route path="/equipamiento" element={<EquipmentPage />} />
        <Route path="/capacitaciones" element={<TrainingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/exportaciones" element={<ExportsPage />} />
        <Route path="/simulacion" element={<SimulationPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/soporte" element={<SupportPage />} />
        <Route path="/notificaciones" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteErrorBoundary>
          <AuthProvider>
            <OrganizationProvider>
              <SecurityGuard />
              <UserWatermark />
              <Routes>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/invite/:token" element={<AcceptInvitation />} />
                <Route path="/location/:token" element={<SharedLocationPage />} />
                <Route path="/terminos" element={<TermsPage />} />
                <Route path="/voluntario/*" element={<VoluntarioApp />} />
                <Route path="*" element={<AppRoutes />} />
              </Routes>
            </OrganizationProvider>
          </AuthProvider>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
