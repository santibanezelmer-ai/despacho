import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { reloadForStaleChunk } from "./lib/staleChunk";

// Guard PWA service worker against preview/iframe contexts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

// Retira el antiguo service worker de caché de la app (no toca el de notificaciones /voluntario-sw.js).
navigator.serviceWorker?.getRegistrations().then((regs) => {
  regs.forEach((r) => {
    const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
    if (isPreviewHost || isInIframe || url.endsWith("/sw.js")) r.unregister();
  });
});

window.addEventListener("vite:preloadError", (event) => {
  if (reloadForStaleChunk()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
