import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider, useOrganization } from "@/contexts/OrganizationContext";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterOrganization from "@/pages/RegisterOrganization";
import PendingApproval from "@/pages/PendingApproval";
import ResetPassword from "@/pages/ResetPassword";
import DispatchConsole from "@/pages/DispatchConsole";
import ActiveEmergencies from "@/pages/ActiveEmergencies";
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
import AlertsPage from "@/pages/AlertsPage";
import SimulationPage from "@/pages/SimulationPage";
import TrainingPage from "@/pages/TrainingPage";
import AuditPage from "@/pages/AuditPage";
import ExportsPage from "@/pages/ExportsPage";
import ProfilePage from "@/pages/ProfilePage";
import SuperadminLayout from "@/pages/superadmin/SuperadminLayout";
import SuperadminDashboard from "@/pages/superadmin/SuperadminDashboard";
import SuperadminOrganizations from "@/pages/superadmin/SuperadminOrganizations";
import SuperadminRequests from "@/pages/superadmin/SuperadminRequests";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading: authLoading, isSuperadmin } = useAuth();
  const { orgId, currentOrg, loading: orgLoading, memberships } = useOrganization();
  const location = useLocation();

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emergency" />
      </div>
    );
  }

  if (!user) {
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

  if (location.pathname === '/pantalla-central') {
    return <CentralScreen />;
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

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DispatchConsole />} />
        <Route path="/emergencias" element={<ActiveEmergencies />} />
        <Route path="/mapa" element={<OperativeMap />} />
        <Route path="/voluntarios" element={<Volunteers />} />
        <Route path="/moviles" element={<Vehicles />} />
        <Route path="/companias" element={<Companies />} />
        <Route path="/claves" element={<EmergencyKeysAdmin />} />
        <Route path="/equipamiento" element={<EquipmentPage />} />
        <Route path="/capacitaciones" element={<PlaceholderPage title="Capacitaciones" description="Registro de cursos, certificaciones y vencimientos." />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auditoria" element={<PlaceholderPage title="Auditoría" description="Registro completo de todas las acciones del sistema." />} />
        <Route path="/exportaciones" element={<PlaceholderPage title="Exportaciones" description="Exportar datos a Excel y PDF con filtros." />} />
        <Route path="/simulacion" element={<SimulationPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
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
        <AuthProvider>
          <OrganizationProvider>
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<AppRoutes />} />
            </Routes>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
