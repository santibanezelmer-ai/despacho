# Architecture rules

- Mount native push registration inside the shared authenticated-provider/router tree, not only AppRoutes, so volunteer routes and legacy mobile deep-link redirects keep the existing native registration lifecycle.
- Route legacy `/mobile/*` links to the existing volunteer application before desktop/native guards; use the same volunteer views rather than maintaining a second mobile interface.

- Synchronize the dispatch theme through `useScreenTheme` for the page, app shell, and dispatch dialog; each has a separate DOM root, and the sidebar must share the console's chosen palette.
- Render the finalization dialog in a body portal above operational cards and keep its personnel pickers above the dialog overlay; card stacking contexts must not obscure closure confirmation.
- Route+km (src/data/routes, scripts/import-mop-route.py; reverse marker→km via findNearestRouteKm, suggestion only, never auto-overwrites address) and landmarks (src/data/landmarks, scripts/import-mop-bridges.py) are static read-only JSON copies of official sources, lazy-loaded by src/lib/routeKilometer.ts and src/lib/landmarks.ts; never query external sources at search time — live emergencies need instant local lookup.
- Territorial layers (src/data/territorial, scripts/import-territorial-kml.py, src/lib/territorialLayers.ts) are a static read-only copy of the Osorno prehospital KML, lazy-loaded once per map and rendered as SVG panes below operational markers; view-only — jurisdiction logic is a separate phase.
- Territory coverage (src/lib/territoryLookup.ts, TerritoryStatus) is a single informative ray-casting check on the exact KML polygons fed by the final emergency coordinate; boundary and overlaps are reported, never auto-resolved, and it never assigns resources.
- Vehicle assignability comes only from src/lib/vehicleAvailability.ts (open emergency_vehicles + 6-9/10-9); reassignment closes the previous participation with released_at and logs both emergencies — never deletes history.
- /pantalla-mapa renders OperativeMap in screen mode; never fork a second map implementation.
- Mobile operational keys (6-3/6-7/6-8/6-9/6-10) arrive as pending rows in vehicle_operational_requests via operix-movil; only the console applies them (accept uses the mobile's reported time) and any manual console key change supersedes pending requests — the console always has priority.
- Remote screens (/tv) never use user sessions: they pair by 6-digit PIN through the screen-display function and read org data with their own secret, read-only and without personal contact data — TVs in stations have no accounts.
- Grant Operix Voluntario access via src/lib/volunteerAccess.ts (any active org member, active org prioritized); feature permissions stay in rolePermissions/RLS — one account must work in console and volunteer app.
- Console 6-10 returns (single or coordinated) go only through src/lib/vehicleReturn.ts: operator-selected vehicles, explicit confirmation, sequential per-vehicle results, and updates guarded by released_at IS NULL so concurrent consoles cannot double-return or show false success.
