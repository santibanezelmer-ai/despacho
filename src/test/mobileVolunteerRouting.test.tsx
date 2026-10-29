import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
const state = vi.hoisted(() => ({ native: false, user: null as null | { id: string }, push: vi.fn(), access: true }));
vi.mock("@/components/error/RouteErrorBoundary", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/layout/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/pages/LandingPage", () => ({ default: () => <div data-testid="LandingPage" /> }));
vi.mock("@/pages/LoginPage", () => ({ default: () => <div data-testid="LoginPage" /> }));
vi.mock("@/pages/RegisterOrganization", () => ({ default: () => <div data-testid="RegisterOrganization" /> }));
vi.mock("@/pages/PendingApproval", () => ({ default: () => <div data-testid="PendingApproval" /> }));
vi.mock("@/pages/ResetPassword", () => ({ default: () => <div data-testid="ResetPassword" /> }));
vi.mock("@/pages/AcceptInvitation", () => ({ default: () => <div data-testid="AcceptInvitation" /> }));
vi.mock("@/pages/DispatchConsole", () => ({ default: () => <div data-testid="DispatchConsole" /> }));
vi.mock("@/pages/ActiveEmergencies", () => ({ default: () => <div data-testid="ActiveEmergencies" /> }));
vi.mock("@/pages/DispatchNotes", () => ({ default: () => <div data-testid="DispatchNotes" /> }));
vi.mock("@/pages/EmergencyHistory", () => ({ default: () => <div data-testid="EmergencyHistory" /> }));
vi.mock("@/pages/Dashboard", () => ({ default: () => <div data-testid="Dashboard" /> }));
vi.mock("@/pages/Volunteers", () => ({ default: () => <div data-testid="Volunteers" /> }));
vi.mock("@/pages/Vehicles", () => ({ default: () => <div data-testid="Vehicles" /> }));
vi.mock("@/pages/Companies", () => ({ default: () => <div data-testid="Companies" /> }));
vi.mock("@/pages/EmergencyKeysAdmin", () => ({ default: () => <div data-testid="EmergencyKeysAdmin" /> }));
vi.mock("@/components/shared/PlaceholderPage", () => ({ default: () => <div data-testid="PlaceholderPage" /> }));
vi.mock("@/pages/AdminPanel", () => ({ default: () => <div data-testid="AdminPanel" /> }));
vi.mock("@/pages/OperativeMap", () => ({ default: () => <div data-testid="OperativeMap" /> }));
vi.mock("@/pages/TvScreen", () => ({ default: () => <div data-testid="TvScreen" /> }));
vi.mock("@/pages/Equipment", () => ({ default: () => <div data-testid="Equipment" /> }));
vi.mock("@/pages/CentralScreen", () => ({ default: () => <div data-testid="CentralScreen" /> }));
vi.mock("@/pages/MapScreen", () => ({ default: () => <div data-testid="MapScreen" /> }));
vi.mock("@/pages/AlertsPage", () => ({ default: () => <div data-testid="AlertsPage" /> }));
vi.mock("@/pages/SimulationPage", () => ({ default: () => <div data-testid="SimulationPage" /> }));
vi.mock("@/pages/TrainingPage", () => ({ default: () => <div data-testid="TrainingPage" /> }));
vi.mock("@/pages/CompanyDuty", () => ({ default: () => <div data-testid="CompanyDuty" /> }));
vi.mock("@/pages/AuditPage", () => ({ default: () => <div data-testid="AuditPage" /> }));
vi.mock("@/pages/ExportsPage", () => ({ default: () => <div data-testid="ExportsPage" /> }));
vi.mock("@/pages/NotificationsPage", () => ({ default: () => <div data-testid="NotificationsPage" /> }));
vi.mock("@/pages/ProfilePage", () => ({ default: () => <div data-testid="ProfilePage" /> }));
vi.mock("@/pages/superadmin/SuperadminLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/pages/superadmin/SuperadminDashboard", () => ({ default: () => <div data-testid="SuperadminDashboard" /> }));
vi.mock("@/pages/superadmin/SuperadminOrganizations", () => ({ default: () => <div data-testid="SuperadminOrganizations" /> }));
vi.mock("@/pages/superadmin/SuperadminRequests", () => ({ default: () => <div data-testid="SuperadminRequests" /> }));
vi.mock("@/pages/superadmin/SuperadminSupport", () => ({ default: () => <div data-testid="SuperadminSupport" /> }));
vi.mock("@/pages/superadmin/SuperadminHealth", () => ({ default: () => <div data-testid="SuperadminHealth" /> }));
vi.mock("@/pages/SupportPage", () => ({ default: () => <div data-testid="SupportPage" /> }));
vi.mock("@/pages/admin/OnboardingPage", () => ({ default: () => <div data-testid="OnboardingPage" /> }));
vi.mock("@/pages/voluntario/VoluntarioApp", async () => { const { useLocation } = await import("react-router-dom"); return { default: () => { const location = useLocation(); return <div data-testid="volunteer">{location.pathname}</div>; } }; });
vi.mock("@/pages/SharedLocationPage", () => ({ default: () => <div data-testid="SharedLocationPage" /> }));
vi.mock("@/pages/legal/TermsPage", () => ({ default: () => <div data-testid="TermsPage" /> }));
vi.mock("@/pages/legal/PrivacyPage", () => ({ default: () => <div data-testid="PrivacyPage" /> }));
vi.mock("@/components/security/SecurityGuard", () => ({ default: () => <div data-testid="SecurityGuard" /> }));
vi.mock("@/components/security/UserWatermark", () => ({ default: () => <div data-testid="UserWatermark" /> }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children, useAuth: () => ({ user: state.user, loading: false, isSuperadmin: true }) }));
vi.mock("@/contexts/OrganizationContext", () => ({ OrganizationProvider: ({ children }: { children: React.ReactNode }) => children, useOrganizationOptional: () => ({ orgId: "org", orgRole: "operador", loading: false, memberships: [{ role: "operador" }], currentOrg: { organization: { status: "active" } } }) }));
vi.mock("@/hooks/useIsNativeMobile", () => ({ useIsNativeMobile: () => state.native }));
vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: state.push }));
vi.mock("@/lib/rolePermissions", () => ({ canAccessPath: () => state.access, defaultPathFor: () => "/emergencias" }));
beforeEach(() => { state.native = false; state.user = { id: "test" }; state.access = true; state.push.mockClear(); Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 }); });
afterEach(cleanup);
function open(path: string) { window.history.replaceState({}, "", path); render(<App />); }
describe("Volunteer mobile routing", () => {
  it.each([
    ["/mobile", "/voluntario"],
    ["/mobile/feed", "/voluntario"],
    ["/mobile/map", "/voluntario/mapa"],
    ["/mobile/profile", "/voluntario/perfil"],
    ["/mobile/emergency/emergency-123", "/voluntario/emergencia/emergency-123"],
  ])("redirects %s to %s", async (from, to) => {
    open(from);
    await waitFor(() => expect(window.location.pathname).toBe(to));
    expect(screen.getByTestId("volunteer")).toHaveTextContent(to);
  });
  it("redirects authenticated native initial access to volunteers", async () => {
    state.native = true; open("/");
    await waitFor(() => expect(window.location.pathname).toBe("/voluntario"));
  });
  it("redirects signed-out native initial access to volunteer login", async () => {
    state.native = true; state.user = null; open("/");
    await waitFor(() => expect(window.location.pathname).toBe("/voluntario/login"));
  });
  it("runs native push registration on authenticated volunteer routes", () => {
    state.native = true; open("/voluntario");
    expect(state.push).toHaveBeenCalled();
  });
  it("keeps the browser operator console", () => {
    open("/"); expect(screen.getByTestId("DispatchConsole")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });
  it.each(["/pantalla-central", "/pantalla-mapa", "/pantalla-emergencias", "/superadmin"])("keeps native access in the volunteer app from %s", async path => {
    state.native = true; open(path);
    await waitFor(() => expect(window.location.pathname).toBe('/voluntario'));
    expect(screen.getByTestId("volunteer")).toBeInTheDocument();
  });
  it.each([["/", "DispatchConsole"], ["/dashboard", "Dashboard"], ["/admin", "AdminPanel"], ["/guardias", "CompanyDuty"]])("preserves authorized phone-browser access to %s", async (path, page) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    open(path);
    await screen.findByTestId(page);
    expect(window.location.pathname).toBe(path);
  });
  it("keeps permission checks in phone browsers", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    state.access = false; open('/admin');
    await waitFor(() => expect(window.location.pathname).toBe('/emergencias'));
  });
  it("keeps desktop permission redirects", async () => {
    state.access = false; open("/");
    await waitFor(() => expect(window.location.pathname).toBe("/emergencias"));
  });
  it("keeps browser login for signed-out operators", () => {
    state.user = null; open("/login");
    expect(screen.getByTestId("LoginPage")).toBeInTheDocument();
  });
});
