import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickVolunteerMembership, volunteerRecordBlock, NO_ORG_MESSAGE, DISABLED_MESSAGE } from "@/lib/volunteerAccess";
import { canAccessPath } from "@/lib/rolePermissions";

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  members: [] as any[],
  vol: null as any,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, in: () => q,
      maybeSingle: async () => ({ data: state.vol, error: null }),
      then: (res: any) => res({ data: table === "organization_members" ? state.members : [], error: null }),
    };
    return q;
  };
  return { supabase: { from: builder, auth: { signOut: vi.fn() } } };
});
vi.mock("@/services/fcmWebPush", () => ({ ensureVolunteerServiceWorker: async () => {}, listenForeground: () => () => {}, registerVolunteerPush: async () => null }));
vi.mock("@/services/defaultDispatchTone", () => ({ playDefaultDispatchTone: () => {} }));
vi.mock("@/pages/voluntario/VoluntarioLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/pages/voluntario/VoluntarioLogin", () => ({ default: () => <div data-testid="login" /> }));
vi.mock("@/pages/voluntario/VoluntarioFeed", () => ({ default: ({ organizationId }: any) => <div data-testid="feed">{organizationId}</div> }));
vi.mock("@/pages/voluntario/VoluntarioDetail", () => ({ default: () => null }));
vi.mock("@/pages/voluntario/VoluntarioHistory", () => ({ default: () => null }));
vi.mock("@/pages/voluntario/VoluntarioProfile", () => ({ default: () => null }));
vi.mock("@/pages/voluntario/VoluntarioMap", () => ({ default: () => null }));

import VoluntarioApp from "@/pages/voluntario/VoluntarioApp";

const org = (id: string, status = "active") => ({ id, name: id, status, logo_url: null });
const member = (role: string, orgId = "org-a", orgStatus = "active") => ({ organization_id: orgId, role, status: "active", organizations: org(orgId, orgStatus) });

function open(path = "/voluntario") {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/voluntario/*" element={<VoluntarioApp />} /></Routes></MemoryRouter>);
}

beforeEach(() => { state.user = { id: "u1" }; state.members = []; state.vol = null; });
afterEach(cleanup);

describe("Operix Voluntario access", () => {
  it.each(["admin", "operador", "oficial", "voluntario", "visor"])("allows active %s member", async role => {
    state.members = [member(role)];
    open();
    expect(await screen.findByTestId("feed")).toHaveTextContent("org-a");
  });

  it("allows admin without volunteer record", async () => {
    state.members = [member("admin")]; state.vol = null;
    open(); expect(await screen.findByTestId("feed")).toBeInTheDocument();
  });

  it("allows admin even if volunteer record has PWA disabled", async () => {
    state.members = [member("admin")]; state.vol = { pwa_enabled: false, status: "inactivo" };
    open(); expect(await screen.findByTestId("feed")).toBeInTheDocument();
  });

  it("blocks volunteer with PWA disabled", async () => {
    state.members = [member("voluntario")]; state.vol = { pwa_enabled: false, status: "activo" };
    open(); expect(await screen.findByText(DISABLED_MESSAGE)).toBeInTheDocument();
  });

  it("signed-out user is sent to volunteer login", async () => {
    state.user = null; open("/voluntario/mapa");
    expect(await screen.findByTestId("login")).toBeInTheDocument();
  });

  it("user without memberships sees no-organization message", async () => {
    open(); expect(await screen.findByText(NO_ORG_MESSAGE)).toBeInTheDocument();
  });

  it("user only in an inactive organization sees no-organization message", async () => {
    state.members = [member("admin", "org-x", "suspended")];
    open(); expect(await screen.findByText(NO_ORG_MESSAGE)).toBeInTheDocument();
  });

  it("prioritizes active organization", () => {
    expect(pickVolunteerMembership([member("admin", "old", "suspended"), member("operador", "live")])?.organization_id).toBe("live");
  });

  it("rejects unknown roles", () => {
    expect(pickVolunteerMembership([member("intruso")])).toBeNull();
  });

  it("inactive volunteer record blocks only volunteers", () => {
    expect(volunteerRecordBlock("voluntario", { pwa_enabled: true, status: "inactivo" })).toBe(DISABLED_MESSAGE);
    expect(volunteerRecordBlock("oficial", { pwa_enabled: true, status: "inactivo" })).toBeNull();
  });

  it("admin keeps web console and admin permissions", () => {
    const ctx = { orgRole: "admin" as const, isCompanyAdmin: false, isSuperadmin: false };
    expect(canAccessPath("/", ctx)).toBe(true);
    expect(canAccessPath("/admin", ctx)).toBe(true);
  });

  it("operator console restrictions unchanged", () => {
    expect(canAccessPath("/admin", { orgRole: "operador", isCompanyAdmin: false, isSuperadmin: false })).toBe(false);
  });
});
