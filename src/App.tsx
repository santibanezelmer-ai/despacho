import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import PlaceholderPage from "@/components/shared/PlaceholderPage";
import AdminPanel from "@/pages/AdminPanel";
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

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DispatchConsole />} />
        <Route path="/emergencias" element={<ActiveEmergencies />} />
        <Route path="/mapa" element={<PlaceholderPage title="Mapa Operativo" description="Mapa interactivo con emergencias, móviles, grifos y zonas." />} />
        <Route path="/voluntarios" element={<Volunteers />} />
        <Route path="/moviles" element={<Vehicles />} />
        <Route path="/equipamiento" element={<PlaceholderPage title="Equipamiento" description="Gestión de inventario y herramientas por móvil." />} />
        <Route path="/capacitaciones" element={<PlaceholderPage title="Capacitaciones" description="Registro de cursos, certificaciones y vencimientos." />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auditoria" element={<PlaceholderPage title="Auditoría" description="Registro completo de todas las acciones del sistema." />} />
        <Route path="/exportaciones" element={<PlaceholderPage title="Exportaciones" description="Exportar datos a Excel y PDF con filtros." />} />
        <Route path="/pantalla-central" element={<PlaceholderPage title="Pantalla Central (TV)" description="Vista en tiempo real para pantallas de cuartel." />} />
        <Route path="/simulacion" element={<PlaceholderPage title="Modo Simulación" description="Crear emergencias ficticias para entrenamiento." />} />
        <Route path="/alertas" element={<PlaceholderPage title="Alertas Internas" description="Alertas de falta de personal, móviles y tiempos." />} />
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
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
