import { supabase } from "@/integrations/supabase/client";

export interface ClientErrorPayload {
  kind: string;
  message: string;
  stack?: string;
  route?: string;
  userId?: string | null;
  orgId?: string | null;
  extra?: Record<string, any>;
}

/**
 * Logs a client-side context/provider failure to the backend audit_log table
 * (best-effort; swallows its own errors). Always logs to console too.
 */
export async function logClientError(payload: ClientErrorPayload) {
  // Always print to console for local visibility
  console.error(`[client-error:${payload.kind}]`, payload);

  try {
    const route =
      payload.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined);

    let userId = payload.userId ?? null;
    if (!userId) {
      try {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      } catch {
        /* ignore */
      }
    }

    if (!payload.orgId) {
      // No org context → cannot insert into audit_log (requires organization_id).
      // Skip remote logging silently in that case.
      return;
    }

    await (supabase as any).rpc("insert_audit_log", {
      _action: `client_error:${payload.kind}`,
      _organization_id: payload.orgId,
      _new_data: {
        message: payload.message,
        stack: payload.stack,
        route,
        user_id: userId,
        extra: payload.extra ?? null,
        ts: new Date().toISOString(),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    });
  } catch {
    // best-effort, never throw from logger
  }
}
