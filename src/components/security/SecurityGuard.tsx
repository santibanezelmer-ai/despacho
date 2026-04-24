import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Frontend hardening for operational routes.
 * - Disables right-click context menu
 * - Blocks DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
 * - Disables text selection on sensitive containers (opt-in via .no-select)
 * - Anti-debugger loop in production
 *
 * NOTE: this is disuasive only. A determined dev can always bypass it.
 * Real protection lives in the backend (RLS, edge functions, secrets).
 */

const PUBLIC_ROUTES = ["/landing", "/login", "/register", "/reset-password", "/pending"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

export default function SecurityGuard() {
  const location = useLocation();

  useEffect(() => {
    if (isPublicRoute(location.pathname)) return;
    if (import.meta.env.DEV) return; // do not annoy developers

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + Shift + I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U") {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + S (save page)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "S") {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    // Lightweight anti-debugger heartbeat
    let interval: number | undefined;
    if (import.meta.env.PROD) {
      interval = window.setInterval(() => {
        const t0 = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const dt = performance.now() - t0;
        if (dt > 150) {
          // DevTools likely open — soft redirect to landing
          window.location.replace("/landing");
        }
      }, 4000);
    }

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      if (interval) window.clearInterval(interval);
    };
  }, [location.pathname]);

  return null;
}
