# Lines

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: Route-related Line search and CRUD, named variants, and outbound/return departure-time-slot references.
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

[ ] LINE-01 Confirm Line search/detail/create/update/delete endpoints, verbs, envelopes, parent IDs, slot projections and paging through read-only source/schema inspection; no production calls.
[ ] LINE-02 Resolve Q09/Q14 and required-Route versus optional-interface discrepancies; retain source-matching DTO types, explicitly reconcile `enteranceShiftTimeName` and avoid invented station membership or slot precedence.
[ ] LINE-03 Inspect existing libraries and Nx generator help, dry-run then generate needed Line libraries with Bun/Nx; place all forms/lists/selectors in libraries and export typed config/provider/route factories.
[ ] LINE-04 Register aliases, Nx scope/type tags and exact Route/departure-time dependency edges plus Sheriff mappings; prevent app imports, deep imports and UI dependencies in data-access.
[ ] LINE-05 Implement route-scoped NgRx SignalStore keyed by session/company/Route ID/Line ID/filter/page; cancel stale parent/slot requests and reset sensitive state on reused-route or company changes.
[ ] LINE-06 Build standalone OnPush Line forms with local signals and Signal Forms; hydrate name, Direction and both optional time-slot IDs without clobbering drafts, and map empty values explicitly.
[ ] LINE-07 Reuse Route and departure-time pickers plus shared field/confirmation controls through typed public APIs; distinguish named clock slots from work Shifts and business Routes from URL routes.
[ ] LINE-08 Compose TanStack Table v9 and Spartan Line lists using confirmed server search/paging; remove fixed-first-page behavior and provide truthful page indices and loading/empty/error states.
[ ] LINE-09 Prove create-read-edit-read-delete roundtrips for parent and both slot references; cover optional/required contradictions, projection types and later pages instead of reproducing legacy defects.
[ ] LINE-10 Derive authorized company/Route context without hardcoded company IDs; test direct/inaccessible/deleted parents, switches and server denial, without treating optional passenger Line as an eligibility decision (Q16).
[ ] LINE-11 Register Tailwind library/Helm sources and semantic logical styles; verify responsive RTL/LTR time-slot labels, keyboard tables/pickers and field-error focus.
[ ] LINE-12 Verify standalone and nested Line routes in an alternate consumer with different mount paths/API/destinations; expose reusable Line selection without coupling to panel allocation screens.
[ ] LINE-13 Add unit tests for DTO/projection adapters, optional-slot mapping, parent gating, multi-page queries, scoped-store races, form hydration and failed/duplicate mutations.
[ ] LINE-14 Run discovered Bun/Nx targets and browser/accessibility CRUD tests across parent changes and paging; verify protected client rendering, SSR/hydration isolation and no private HTTP transfer caching.
[ ] LINE-15 Record implementation and contract/test evidence before completion; separate fixture coverage from approved non-production API acceptance and keep Q09/Q14/Q16 policy boundaries explicit.

## Evidence Placeholder

Not completed. Parent/slot contract decisions, public APIs, Bun/Nx results, browser/accessibility, alternate-mount and client/SSR evidence: pending.
No production calls, Line-owned Station sequence, independent saved geometry or live-backend acceptance are claimed from legacy S10/S12.
