import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
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
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emergency" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <ProtectedContent />;
}

function ProtectedContent() {
  const location = useLocation();

  // Pantalla Central renders without the sidebar layout
  if (location.pathname === '/pantalla-central') {
    return <CentralScreen />;
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
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
