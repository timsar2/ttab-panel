# Maps and Geography TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** a reusable browser-only Neshan MapLibre station marker adapter is implemented and mounted by Routes. A valid origin-restricted Web Map key and routing/geometry policy remain unresolved. Read domain sections C5-C7 and H.

## Library Ownership and Dependencies

Generate a browser-only reusable map adapter/UI boundary under shared libraries
and a transport-specific Route-map feature where actual domain behavior requires
it. Keep provider configuration, geography adapters, and transport overlays separate.
All map components and helper functions belong to Nx libraries.

Depends on [shared coordinates/lookups](00-foundation-and-shared-controls.md),
[Routes](10-routes.md), and [Stations](13-stations.md). Coordinate numeric entry
can precede map selection. Realtime markers additionally depend on
[tracking](18-realtime-tracking.md).

## Tasks

[ ] MAP-01 Resolve Q09-Q11/Q22: intended map/routing provider, licensing, browser-key restrictions/proxy, saved geometry, map ownership, and service identity.
[x] MAP-02 Distinguish the active hardcoded Mapbox dashboard from the routed incomplete Leaflet map; inventory behavior to preserve versus replace.
[x] MAP-03 Generate reusable browser-only adapter/map UI and transport-map feature boundaries with injectable provider configuration and no embedded keys.
[ ] MAP-04 Implement shared coordinate normalization/range validation and preserve flat/nested DTO mapping plus valid zero latitude/longitude.
[ ] MAP-05 Implement coordinate pick/confirm/cancel/reset and edit initialization without copying commented click-output/recenter logic.
[x] MAP-06 Implement real company/Route station loading with authoritative context, stable ordering, missing-coordinate handling, and empty/error states.
[ ] MAP-07 Initialize and own the actual routing-control instance correctly before updating waypoints; destroy controls/listeners/maps on teardown.
[ ] MAP-08 Persist or display geometry only according to the approved contract; do not invent Line-owned stops, a saved polyline, or geographic eligibility limits.
[ ] MAP-09 Expose reusable marker/route overlay contracts so tracking can update entities without rebuilding the entire map or importing panel state.
[x] MAP-10 Keep map code out of server execution and heavy provider code behind real lazy boundaries; add a non-map coordinate fallback.
[ ] MAP-11 Verify unavailable providers, denied browser geolocation, bad coordinates, stale parent requests, resizing, and language/direction changes.
[ ] MAP-12 Test two consumer configurations and approved provider adapters using deterministic fixtures without live production calls.
[ ] MAP-13 Verify map/coordinate workflows in RTL/LTR/mobile and production hydration without leaking access tokens to external providers.

## Evidence

The old Route map uses OpenStreetMap tiles, a hardcoded Mapbox routing token and an incomplete Neshan routing-service call. The new map library loads the Neshan MapLibre SDK only in the browser and receives a Web Map key through `environment.neshanMapApiKey`; this value must be separately origin-restricted in each deployment replacement. The current value is empty, so the UI shows a key-missing fallback; the old `service.*` key is not copied or treated as a map key. Stations load from the company/Route-scoped API, are ordered by `orderNo`, and invalid/missing coordinates are omitted from markers but remain in the station list. No route line or saved geometry is fabricated.

Route/data/map tests, lint, and the panel production build pass. The browser map has not been run because no map key or Playwright browser executables are available. Map origin restrictions, live provider behavior, geometry persistence and realtime integration remain unverified.
