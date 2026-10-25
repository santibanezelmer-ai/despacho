# Architecture rules

- Guardias uses a shared read-only preparation page in Resources and the volunteer shell; until its SQL and real authorization are validated, never issue Guard queries or mutations or infer Guard management rights from ordinary membership roles.

- Hydrant SELECT is shared across authenticated organization members; preserve owner-scoped write RLS and derive map ownership from organization_id, never from which table supplied the record.

- Mount native push registration inside the shared authenticated-provider/router tree, not only AppRoutes, so volunteer routes and legacy mobile deep-link redirects keep the existing native registration lifecycle.
- Route legacy `/mobile/*` links to the existing volunteer application before desktop/native guards; use the same volunteer views rather than maintaining a second mobile interface.

- Synchronize the dispatch theme through `useScreenTheme` for the page, app shell, and dispatch dialog; each has a separate DOM root, and the sidebar must share the console's chosen palette.
- Render the finalization dialog in a body portal above operational cards and keep its personnel pickers above the dialog overlay; card stacking contexts must not obscure closure confirmation.
- Route+km (src/data/routes, scripts/import-mop-route.py; reverse marker→km via findNearestRouteKm, suggestion only, never auto-overwrites address) and landmarks (src/data/landmarks, scripts/import-mop-bridges.py) are static read-only JSON copies of official sources, lazy-loaded by src/lib/routeKilometer.ts and src/lib/landmarks.ts; never query external sources at search time — live emergencies need instant local lookup.
- Territorial layers (src/data/territorial, scripts/import-territorial-kml.py, src/lib/territorialLayers.ts) are a static read-only copy of the Osorno prehospital KML, lazy-loaded once per map and rendered as SVG panes below operational markers; view-only — jurisdiction logic is a separate phase.
- Territory coverage (src/lib/territoryLookup.ts, TerritoryStatus) is a single informative ray-casting check on the exact KML polygons fed by the final emergency coordinate; boundary and overlaps are reported, never auto-resolved, and it never assigns resources.
- Vehicle assignability comes only from src/lib/vehicleAvailability.ts (open emergency_vehicles + 6-9/10-9); reassignment closes the previous participation with released_at and logs both emergencies — never deletes history.
- /pantalla-mapa renders OperativeMap in screen mode; never fork a second map implementation.
- Mobile operational keys (6-3/6-7/6-8/6-9/6-10) arrive as pending rows in vehicle_operational_requests via operix-movil; only the console applies them (accept uses the mobile's reported time), and console key changes including returns supersede pending keys but never independent PRE-INFORME rows — field reports require their own acceptance or rejection.
- Remote screens (/tv) never use user sessions: they pair by 6-digit PIN through the screen-display function and read org data with their own secret, read-only and without personal contact data — TVs in stations have no accounts.
- Remote TV requests use the validated, time-bounded screenDisplay transport; retain the last valid display during outages and expose retryable setup errors rather than indefinite loading.
- Grant Operix Voluntario access via src/lib/volunteerAccess.ts (any active org member, active org prioritized); feature permissions stay in rolePermissions/RLS — one account must work in console and volunteer app.
- Console 6-10 returns (single or coordinated) go only through src/lib/vehicleReturn.ts: operator-selected vehicles, explicit confirmation, sequential per-vehicle results, and updates guarded by released_at IS NULL so concurrent consoles cannot double-return or show false success.
- Address search in the dispatch window uses Google Places (New) only through the authenticated google-places edge function; local MOP route/km and crossings stay first, Nominatim resolver is only the fallback when Google fails — never call Places from the browser.
- Organization local landmarks (organization_landmarks, src/lib/localLandmarks.ts) are matched in memory first in LocationSearch before route/km and Google, and drawn on every LeafletMapCanvas via the landmarks prop — instant, cost-free lookup of colloquial names.

- Geographic acceptance of any searched/auto-geocoded coordinate goes only through src/lib/geoJurisdiction.ts (50 km safety radius + commune/region coherence); only status ok auto-accepts, anything else needs explicit operator confirmation logged as an operational exception.
