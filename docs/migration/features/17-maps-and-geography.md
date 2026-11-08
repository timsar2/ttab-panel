# Maps and Geography TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** geographic models and broken/demo legacy map code exist; a working
reusable map/coordinate workflow is not migrated. Read domain sections C5-C7 and H.

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
[ ] MAP-02 Distinguish the active hardcoded Mapbox dashboard from the routed incomplete Leaflet map; inventory behavior to preserve versus replace.
[ ] MAP-03 Generate reusable browser-only adapter/map UI and transport-map feature boundaries with injectable provider configuration and no embedded keys.
[ ] MAP-04 Implement shared coordinate normalization/range validation and preserve flat/nested DTO mapping plus valid zero latitude/longitude.
[ ] MAP-05 Implement coordinate pick/confirm/cancel/reset and edit initialization without copying commented click-output/recenter logic.
[ ] MAP-06 Implement real company/Route station loading with authoritative context, stable ordering, missing-coordinate handling, and empty/error states.
[ ] MAP-07 Initialize and own the actual routing-control instance correctly before updating waypoints; destroy controls/listeners/maps on teardown.
[ ] MAP-08 Persist or display geometry only according to the approved contract; do not invent Line-owned stops, a saved polyline, or geographic eligibility limits.
[ ] MAP-09 Expose reusable marker/route overlay contracts so tracking can update entities without rebuilding the entire map or importing panel state.
[ ] MAP-10 Keep map code out of server execution and heavy provider code behind real lazy boundaries; add a non-map coordinate fallback.
[ ] MAP-11 Verify unavailable providers, denied browser geolocation, bad coordinates, stale parent requests, resizing, and language/direction changes.
[ ] MAP-12 Test two consumer configurations and approved provider adapters using deterministic fixtures without live production calls.
[ ] MAP-13 Verify map/coordinate workflows in RTL/LTR/mobile and production hydration without leaking access tokens to external providers.

## Evidence

Record provider decisions, contract-backed geometry, browser screenshots,
credentials/origin isolation checks, and teardown tests. A static marker or demo
route does not complete geographical configuration or live tracking.
