# Routes

[Main TODO](../TODO.md)

## Scope And Status

Partial implementation: company-scoped Direction search/detail, first-station departure view/edit form, row actions, and Route-station map/list are mounted through reusable transport libraries. App writes and map rendering remain gated on authorization and map-key decisions.
Business Route is legacy `Direction`, not an Angular route, Line, Trip or saved polyline; legacy source is not migrated completion.
Required reading and shared delivery rules are inherited from the main TODO; interactive geography remains a coordinated, separately gated dependency.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/routes/data-access` and `libs/transport/routes/feature`.
Generate needed feature libraries with Bun/Nx; route list/form/detail components belong in appropriate existing/generated libraries, never `apps/panel`.
Export public typed configuration, scoped providers and a lazy route factory with configurable child integrations; no app imports or concrete mount-path assumptions.
Keep the app thin bootstrap/provider/routing composition and data-access free of UI/navigation; avoid circular feature dependencies through explicit public contracts.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), and [companies](04-companies.md).
Coordinate with [pricing](11-route-pricing.md), [lines](12-lines.md), [stations](13-stations.md), [departure times](08-departure-times.md), and [maps](17-maps-and-geography.md).

## Contract And Business Gates

Domain references: C5, D, E3, F1 L04/L07, J1 Q03-Q05, J2 Q09-Q11 and J3 Q14; primary evidence S09 and S17.
Q09 gates whether Lines share all Route Stations, subsets or distinct order/geometry; do not introduce a Line-to-Station contract absent agreement.
Q10/Q11 gate map provider, saved geometry and geography validation; the current write contract has company/name/`departureTime`, not a persisted polyline.
Q14 gates precedence between Route first-station departure and Line/Shift slots; do not invent routing, travel-time or timezone constraints.
Q03-Q05 gate authorization, scope changes and destructive history effects; route persistence must precede dependent pricing writes.

## Pending Tasks

[x] ROUTE-01 Confirm Direction search/detail/create/update/delete endpoints, verbs, envelopes, IDs and paging by read-only source/schema inspection; separate business Route IDs from URL paths and make no production calls.
[ ] ROUTE-02 Resolve Q03-Q05/Q09-Q11/Q14 contract gates with source-matching types; record map-drawing requirements versus absent geometry fields and avoid invented station membership or departure precedence.
[x] ROUTE-03 Inspect existing boundaries and generator help, dry-run then generate needed route libraries with Bun/Nx; put list/form/detail components in libraries and export configurable providers/routes.
[x] ROUTE-04 Register aliases, Nx scope/type tags, explicit cross-domain edges and Sheriff mappings; reject app imports, feature cycles and UI/navigation dependencies in data-access.
[x] ROUTE-05 Implement route-scoped NgRx SignalStore keyed by session/company/Direction ID/filter/page; cancel stale requests, handle reused parent URLs and invalidate only affected route data.
[x] ROUTE-06 Build standalone OnPush route forms with local signals and Signal Forms for confirmed name/company/departure fields; map wire values explicitly and preserve dirty drafts after failures.
[ ] ROUTE-07 Reuse shared time, company-context, confirmation and field controls; compose library-owned detail entry points for Lines/Stations/Prices without copying forms or embedding panel destinations.
[x] ROUTE-08 Compose TanStack Table v9 and Spartan search/list/detail navigation with supported server filters/paging and accessible loading/empty/error states; keep parent context URL-backed.
[ ] ROUTE-09 Prove create-read-edit-read-delete roundtrips including persisted Route ID handoff to pricing; expose failed dependent steps without duplicating Route creation or treating incomplete maps as completed geography.
[ ] ROUTE-10 Derive authorized company/parent context without hardcoded company IDs; test direct/deleted/inaccessible URLs, logout and company switches, and honor agreed deletion/history behavior.
[ ] ROUTE-11 Register Tailwind library/Helm sources and semantic logical styles; verify mobile RTL/LTR details/tabs, keyboard navigation, departure labels and actionable errors.
[ ] ROUTE-12 Verify alternate-consumer mounting at different base and nested paths with configurable child entries, API and destinations; retain lazy chunks without app imports or fixed `direction` URLs.
[ ] ROUTE-13 Add unit tests for Direction adapters, parent-context reuse, store races, departure roundtrips, scoped CRUD failures and route-to-pricing handoff without inventing geometry persistence.
[ ] ROUTE-14 Run discovered Bun/Nx targets and browser/accessibility tests for CRUD and child navigation; verify protected client rendering, SSR/hydration isolation, private transfer-cache policy and map dependency gating.
[x] ROUTE-15 Record implementation, resolved contract gates and verification evidence before completion; distinguish mocks from approved non-production acceptance and link outstanding geography work to its owning feature.

## Evidence Placeholder

Implemented public libraries at `libs/transport/routes/data-access`, `libs/transport/routes/feature`, and `libs/shared/maps`; the panel mounts legacy `/client/:companyId/direction`. Read adapters follow verified legacy contracts: `POST /v1/directions/search` with `{ companyId }`, `GET /v1/directions/:id`, and `POST /v1/stations/search` with `{ companyId, directionId, name: '' }`. The list loads on entry; the row menu contains the requested view/edit, Lines, and Stations actions; Stations opens the map and ordered station list.

App reads require Admin/Manager plus selected-company context; API-side entity ownership must still be enforced. The write adapter and first-station time form are implemented, but app writes remain denied pending Q03-Q05. Lines currently resolves to an explicit not-yet-mounted integration placeholder; Route Pricing is not composed. The Neshan MapLibre library is browser-only and displays station markers with valid coordinates. It deliberately does not invent or persist road geometry.

The old Neshan key is a `service.*` routing key. The old environment only provides the Neshan API base URL, while the old Leaflet component uses OpenStreetMap tiles and a hardcoded Mapbox token. A separate origin-restricted Web Map key is configured through `environment.neshanMapApiKey` (development) and `environment.prod.ts` (production); both are empty until deployment supplies the Web Map key. Do not reuse the routing key as a map key. Passed Route data/feature and map tests/lint, `panel-e2e:typecheck/lint`, `panel:lint`, and `panel:build`; browser E2E could not be executed because Playwright browser executables are absent. No production calls, Route mutation acceptance, map-key/origin acceptance, pricing/Lines integration, road geometry, or live-backend behavior are claimed.
