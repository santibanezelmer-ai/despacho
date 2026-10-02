# Architecture rules

- Synchronize the dispatch theme through `useScreenTheme` for the page, app shell, and dispatch dialog; each has a separate DOM root, and the sidebar must share the console's chosen palette.
- Render the finalization dialog in a body portal above operational cards and keep its personnel pickers above the dialog overlay; card stacking contexts must not obscure closure confirmation.
- Route+km (src/data/routes, scripts/import-mop-route.py; reverse marker→km via findNearestRouteKm, suggestion only, never auto-overwrites address) and landmarks (src/data/landmarks, scripts/import-mop-bridges.py) are static read-only JSON copies of official sources, lazy-loaded by src/lib/routeKilometer.ts and src/lib/landmarks.ts; never query external sources at search time — live emergencies need instant local lookup.
- Territorial layers (src/data/territorial, scripts/import-territorial-kml.py, src/lib/territorialLayers.ts) are a static read-only copy of the Osorno prehospital KML, lazy-loaded once per map and rendered as SVG panes below operational markers; view-only — jurisdiction logic is a separate phase.
- Territory coverage (src/lib/territoryLookup.ts, TerritoryStatus) is a single informative ray-casting check on the exact KML polygons fed by the final emergency coordinate; boundary and overlaps are reported, never auto-resolved, and it never assigns resources.
