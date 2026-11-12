// Kill-switch: elimina el service worker antiguo y su caché (versión vieja con texto plano).
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(
          names.filter((n) => isWorkboxCacheForThisRegistration(n) || n === "supabase-api" || n === "operix-audio").map((n) => caches.delete(n)),
        );
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
