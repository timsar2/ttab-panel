# Stations

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: Route-owned Station search and CRUD, name/address/geography, coordinate selection and ordered-stop positioning.
Station belongs to Direction/Route, not Line; legacy forms and sorting are not migrated completion or proof of backend-wide resequencing.
Required reading and shared delivery rules are inherited from the main TODO; passenger associations remain a separate feature.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/stations/data-access` and `libs/transport/stations/feature`.
Generate needed feature libraries with Bun/Nx; Station pages/forms/order controls belong in appropriate existing/generated libraries, never `apps/panel`.
Expose public typed configuration, scoped providers and lazy route/embedding factories with Route context; no app imports, environments or fixed mount paths.
Keep app wiring thin bootstrap/provider/routing composition and data-access independent of UI/navigation; components may share an existing/generated domain library.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), and [routes](10-routes.md).
Coordinate with [lines](12-lines.md), [station-passenger assignments](16-station-passenger-assignments.md), [maps and geography](17-maps-and-geography.md), and [release parity](22-release-and-parity.md).

## Contract And Business Gates

Domain references: C7, D, E3, F1 L04/L14, J2 Q09-Q11 and J3 Q18; primary evidence S11 and S17.
Q09 gates whether Lines use all Route Stations, subsets or distinct sequences; do not silently make Stations Line-owned.
Q11 must establish coordinates/city requirements, permitted geography, order uniqueness and server resequencing; zero coordinates/order are not inherently invalid from source evidence.
Legacy positioning sorts a local list then sends only one Station's `orderNo`; require confirmation of server effects before claiming atomic reorder or adding a bulk endpoint.
Q10 gates map provider and coordinate picking; Q05/Q18 gate deletion/history and passenger associations, not nearest-stop eligibility or geographic routing constraints.

## Pending Tasks

[ ] STATION-01 Confirm Station search/detail/create/update/delete endpoints, envelopes, coordinate shapes and one-record order-write behavior through read-only source/schema inspection; no production calls or assumed bulk-reorder API.
[ ] STATION-02 Resolve Q09-Q11 and Q05/Q18 ownership, geography, ordering and association gates; retain source-matching types and avoid invented positive-order, coordinate, regional or nearest-stop constraints.
[ ] STATION-03 Inspect existing libraries and generator help, dry-run then generate needed Station libraries with Bun/Nx; locate list/form/order components in libraries and export typed config/provider/route factories.
[ ] STATION-04 Register aliases, Nx scope/type tags, precise Route/geography edges and Sheriff mappings; prevent app imports, Line ownership coupling, deep imports and UI dependencies from data-access.
[ ] STATION-05 Implement route-scoped NgRx SignalStore keyed by session/company/Route ID/Station ID/filter/page; cancel stale reads, clear context-sensitive selection and reload authoritative order after confirmed mutations.
[ ] STATION-06 Build standalone OnPush Station forms with local signals and Signal Forms; hydrate name/city/address/coordinates/order once, explicitly adapt read/write coordinate shapes and retain drafts on failure.
[ ] STATION-07 Reuse geography/map-coordinate, ordering, field and confirmation controls through typed APIs; provide keyboard positioning and do not import a panel map or duplicate provider logic.
[ ] STATION-08 Compose TanStack Table v9 and Spartan Station lists with supported server filters/paging and explicit ordering display; avoid claiming a globally complete sequence from one server page.
[ ] STATION-09 Prove create-read-edit-read-delete roundtrips and first/middle/last positioning with controlled fixtures; confirm one-record server resequencing, collision and concurrent-edit behavior before enabling reorder acceptance.
[ ] STATION-10 Derive authorized company/Route context without hardcoded company IDs; test inaccessible/deleted parents, switches and server denial, and apply agreed passenger-history/deletion policy without silent cascades.
[ ] STATION-11 Register Tailwind library/Helm sources and semantic logical styles; verify mobile RTL/LTR geography/order controls, keyboard alternatives, map fallback, focus and actionable field errors.
[ ] STATION-12 Verify nested and independent Station entry points in an alternate consumer with different mount paths/API/map configuration; preserve lazy loading and configurable passenger-association navigation.
[ ] STATION-13 Add unit tests for coordinate/order adapters, zero-value handling, parent identity, one-record reorder payloads, scoped-store races, failed hydration/mutations and authoritative resequencing responses.
[ ] STATION-14 Run discovered Bun/Nx targets and browser/accessibility CRUD/keyboard-order tests; verify protected client rendering, SSR/hydration isolation, browser-only map loading and disabled private transfer caching.
[ ] STATION-15 Record implementation and ordering-contract/test evidence before completion; distinguish mocked reorder behavior from approved non-production backend acceptance and leave unresolved Q09/Q11 policy explicit.

## Evidence Placeholder

Not completed. Ownership/order decisions, public APIs, Bun/Nx results, browser/accessibility results, alternate-consumer and client/SSR evidence: pending.
No production calls, Line-owned Stations, proven global resequencing, nearest-stop eligibility or live-backend acceptance are claimed from legacy S11/S17.
