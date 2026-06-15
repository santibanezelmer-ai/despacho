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
import EmergencyHistory from "@/pages/EmergencyHistory";
import Dashboard from "@/pages/Dashboard";
import Volunteers from "@/pages/Volunteers";
import Vehicles from "@/pages/Vehicles";
import Companies from "@/pages/Companies";
import EmergencyKeysAdmin from "@/pages/EmergencyKeysAdmin";
import PlaceholderPage from "@/components/shared/PlaceholderPage";
import AdminPanel from "@/pages/AdminPanel";
import OperativeMap from "@/pages/OperativeMap";
import EquipmentPage from "@/pages/Equipment";
import CentralScreen from "@/pages/CentralScreen";
import MapScreen from "@/pages/MapScreen";
import AlertsPage from "@/pages/AlertsPage";
import SimulationPage from "@/pages/SimulationPage";
import TrainingPage from "@/pages/TrainingPage";
import AuditPage from "@/pages/AuditPage";
import ExportsPage from "@/pages/ExportsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import SuperadminLayout from "@/pages/superadmin/SuperadminLayout";
import SuperadminDashboard from "@/pages/superadmin/SuperadminDashboard";
import SuperadminOrganizations from "@/pages/superadmin/SuperadminOrganizations";
import SuperadminRequests from "@/pages/superadmin/SuperadminRequests";
import NotFound from "./pages/NotFound";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileFeedPage from "@/pages/mobile/MobileFeedPage";
import MobileEmergencyDetailPage from "@/pages/mobile/MobileEmergencyDetailPage";
import MobileProfilePage from "@/pages/mobile/MobileProfilePage";
import MobileMapPage from "@/pages/mobile/MobileMapPage";
import OnboardingPage from "@/pages/admin/OnboardingPage";
import VoluntarioApp from "@/pages/voluntario/VoluntarioApp";
import { Loader2 } from "lucide-react";
import { useIsNativeMobile } from "@/hooks/useIsNativeMobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import SecurityGuard from "@/components/security/SecurityGuard";
import UserWatermark from "@/components/security/UserWatermark";

const queryClient = new QueryClient();

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Authenticated user on native/mobile hitting a non-mobile route → redirect to mobile feed
  if (isNativeMobile && !location.pathname.startsWith('/mobile') && location.pathname !== '/pantalla-central' && !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/mobile/feed" replace />;
  }

  if (location.pathname === '/pantalla-central') {
    return <CentralScreen />;
  }

  if (location.pathname === '/pantalla-mapa') {
    return <MapScreen />;
  }

  if (location.pathname.startsWith('/superadmin')) {
    if (!isSuperadmin) return <Navigate to="/" replace />;
    return (
      <SuperadminLayout>
        <Routes>
          <Route path="/superadmin" element={<SuperadminDashboard />} />
          <Route path="/superadmin/organizaciones" element={<SuperadminOrganizations />} />
          <Route path="/superadmin/solicitudes" element={<SuperadminRequests />} />
          <Route path="*" element={<Navigate to="/superadmin" replace />} />
        </Routes>
      </SuperadminLayout>
    );
  }

  // If user is voluntario-only (no admin/operador/oficial/visor membership), redirect to /voluntario
  const nonVolunteerMemberships = memberships.filter(m => m.role !== 'voluntario');
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
        <Routes>
          <Route path="/mobile" element={<MobileFeedPage />} />
          <Route path="/mobile/feed" element={<MobileFeedPage />} />
          <Route path="/mobile/emergency/:id" element={<MobileEmergencyDetailPage />} />
          <Route path="/mobile/profile" element={<MobileProfilePage />} />
          <Route path="/mobile/map" element={<MobileMapPage />} />
          <Route path="*" element={<Navigate to="/mobile/feed" replace />} />
        </Routes>
      </MobileLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DispatchConsole />} />
        <Route path="/emergencias" element={<ActiveEmergencies />} />
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
        <Route path="/notificaciones" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
