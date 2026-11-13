# Lines

[Main TODO](../TODO.md)

## Scope And Status

Partial implementation: nested Route-scoped Line search/detail/add/edit, name and optional outbound/return Shift Time references are implemented in reusable transport libraries. App access requires Admin/Manager plus the selected company and parent Route; the backend must validate entity ownership.
Line is distinct from Route, Shift, Vehicle and Trip; legacy Line functionality is not migrated completion or a line-specific geometry contract.
Required reading and shared delivery rules are inherited from the main TODO; allocation and eligibility remain separate consumers.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/lines/data-access` and `libs/transport/lines/feature`.
Generate needed feature libraries with Bun/Nx; Line list/form/selection components belong in appropriate existing/generated libraries, not `apps/panel`.
Export public typed configuration, scoped providers and lazy route/embedding factories accepting Route context; no app imports or fixed paths.
Keep the app thin bootstrap/provider/routing composition and data-access independent of presentation/navigation; do not create one library per component by default.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), [departure times](08-departure-times.md), and [routes](10-routes.md).
Coordinate with [stations](13-stations.md), [driver-line assignments](14-driver-line-assignments.md), [passengers](15-passengers-and-bulk-assignment.md), and [eligibility](21-service-eligibility.md).

## Contract And Business Gates

Domain references: C6, D, E3, F1 L04, G, J2 Q09 and J3 Q14/Q16; primary evidence S10 and S12.
Q09 gates shared Route Stations versus subsets/distinct order/geometry; there is no confirmed Line-to-Station membership contract.
Template-required Direction conflicts with optional `directionId` in the interface; resolve this before accepting a parentless Line.
Q14 gates Route departure versus Line/Shift clock-slot precedence; optional slot IDs are not a complete service schedule or routing rule.
Legacy search overwrites paging; `enteranceShiftTimeName` is misspelled and numerically typed; preserve wire compatibility through confirmed adapters rather than silently inventing types.

## Pending Tasks

[x] LINE-01 Confirm Line search/detail/create/update/delete endpoints, verbs, envelopes, parent IDs, slot projections and paging through read-only source/schema inspection; no production calls.
[ ] LINE-02 Resolve Q09/Q14 and required-Route versus optional-interface discrepancies; retain source-matching DTO types, explicitly reconcile `enteranceShiftTimeName` and avoid invented station membership or slot precedence.
[x] LINE-03 Inspect existing libraries and Nx generator help, dry-run then generate needed Line libraries with Bun/Nx; place all forms/lists/selectors in libraries and export typed config/provider/route factories.
[x] LINE-04 Register aliases, Nx scope/type tags and exact Route/departure-time dependency edges plus Sheriff mappings; prevent app imports, deep imports and UI dependencies in data-access.
[x] LINE-05 Implement route-scoped NgRx SignalStore keyed by session/company/Route ID/Line ID/filter/page; cancel stale parent/slot requests and reset sensitive state on reused-route or company changes.
[x] LINE-06 Build standalone OnPush Line forms with local signals and Signal Forms; hydrate name, Direction and both optional time-slot IDs without clobbering drafts, and map empty values explicitly.
[x] LINE-07 Reuse Route and departure-time pickers plus shared field/confirmation controls through typed public APIs; distinguish named clock slots from work Shifts and business Routes from URL routes.
[x] LINE-08 Compose TanStack Table v9 and Spartan Line lists using confirmed server search/paging; remove fixed-first-page behavior and provide truthful page indices and loading/empty/error states.
[ ] LINE-09 Prove create-read-edit-read-delete roundtrips for parent and both slot references; cover optional/required contradictions, projection types and later pages instead of reproducing legacy defects.
[ ] LINE-10 Derive authorized company/Route context without hardcoded company IDs; test direct/inaccessible/deleted parents, switches and server denial, without treating optional passenger Line as an eligibility decision (Q16).
[ ] LINE-11 Register Tailwind library/Helm sources and semantic logical styles; verify responsive RTL/LTR time-slot labels, keyboard tables/pickers and field-error focus.
[ ] LINE-12 Verify standalone and nested Line routes in an alternate consumer with different mount paths/API/destinations; expose reusable Line selection without coupling to panel allocation screens.
[ ] LINE-13 Add unit tests for DTO/projection adapters, optional-slot mapping, parent gating, multi-page queries, scoped-store races, form hydration and failed/duplicate mutations.
[ ] LINE-14 Run discovered Bun/Nx targets and browser/accessibility CRUD tests across parent changes and paging; verify protected client rendering, SSR/hydration isolation and no private HTTP transfer caching.
[x] LINE-15 Record implementation and contract/test evidence before completion; separate fixture coverage from approved non-production API acceptance and keep Q09/Q14/Q16 policy boundaries explicit.

## Evidence Placeholder

Implemented `libs/transport/lines/data-access` and `libs/transport/lines/feature`, nested at `/client/:companyId/direction/detail/:directionId/lines`. Line list entry posts `{ companyId, directionId, pageNumber, pageSize }` to `/v1/lines/search`; detail entry gets `/v1/lines/:id`; add/edit entry fetches the existing bounded `DepartureTimesApi` lookup from `/v1/shiftTimes`. Add/update posts the source-backed Line DTO with parent Direction and optional Shift Time IDs. The panel allows Admin/Manager operations only when the active company and parent Direction match; the API must independently enforce entity ownership.

The nested editor treats the Route as required context without changing the legacy DTO globally. It supports both `entranceShiftTimeName` and the legacy `enteranceShiftTimeName` display projection, maps empty slot IDs to `null`, and does not calculate time precedence or invent Line-to-Station membership. Line deletion is not exposed.

Passed Line API/model create/update fixtures, list-paging and nested Route-context tests, data/feature typechecks and lint, `panel-e2e:typecheck/lint`, `panel:lint`, and `panel:build`. The browser fixture asserts list search, detail and Shift Time lookup requests on add/edit entry, but browser E2E was not run because Playwright browser executables are unavailable. No production calls, read-after-write backend acceptance, deletion/history behavior, station membership, time-precedence policy, or live-backend acceptance are claimed.
