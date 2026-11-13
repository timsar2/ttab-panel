# Vehicles

[Main TODO](../TODO.md)

## Scope And Status

Partial implementation: reusable company-context vehicle search and CRUD, driver/type selection, vehicle metadata, document replacement, and inline vehicle-type creation are implemented in transport libraries. The Panel adapter enables Admin/Manager reads for the active company (vehicle search/detail/type choices and driver/person search/detail); vehicle and type mutations remain gated on the business decisions below.
Legacy `car` behavior is not migrated completion; vehicle-driver association is not a dated service assignment or readiness guarantee.
Required reading and shared delivery rules are inherited from the main TODO; allocation and historical resource policy remain separately gated.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/vehicles/data-access` and `libs/transport/vehicles/feature`.
Generate needed feature libraries with Bun/Nx; vehicle/type pages, dialogs and controls belong in appropriate existing/generated libraries, not `apps/panel`.
Export public typed configuration, scoped providers and a lazy route factory; libraries must not import app environments, stores or concrete routes.
Keep the app thin bootstrap/provider/routing composition and data-access free of UI/navigation; components may share a domain library.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), and [drivers](06-drivers.md).
Coordinate with [driver-line assignments](14-driver-line-assignments.md), [service eligibility](21-service-eligibility.md), and [release parity](22-release-and-parity.md).

## Contract And Business Gates

Domain references: C4, E2/E4, F1 L03/L11, J1 Q02-Q05 and J2 Q06-Q08; primary evidence S08 and S19.
Company-filtered search and a write DTO without company require Q02 ownership/derivation confirmation, not an invented company field.
Capacity is recorded metadata only unless Q08 policy is agreed; do not infer boarding limits, plate uniqueness, licence validity or readiness enforcement.
Q06/Q07 gate dated vehicle/service identity, substitutions and history; a Driver-Line write has no Vehicle reference.
Preserve wire spelling `produnctionYear` in adapters; distinguish `carTypeId`/`model` type creation from `vehicleTypeId`, and resolve image preserve/clear semantics.

## Pending Tasks

[x] VEHICLE-01 Confirm vehicle/type endpoints, CRUD verbs, lookup creation, response envelopes, paging and picture payloads through read-only source/schema inspection; no production calls or assumed endpoint names.
[ ] VEHICLE-02 Resolve Q02-Q08 ownership, access, deletion/history and metadata-policy gates; retain code-matching types and record the source's eight-character required plate versus weak capacity/year/selection validation.
[x] VEHICLE-03 Inspect existing controls and generator help, dry-run then generate required vehicle libraries with Bun/Nx; keep all vehicle/type components inside libraries and expose config/provider/route factories.
[x] VEHICLE-04 Register aliases, Nx scope/type tags and precise edges plus Sheriff mappings; prevent app imports, private driver-library imports and presentation dependencies from data-access.
[x] VEHICLE-05 Implement route-scoped NgRx SignalStore records/status/errors keyed by session/company/vehicle/filter/page, with stale-read cancellation, scoped lookup state and targeted invalidation.
[x] VEHICLE-06 Implement standalone OnPush forms with local signals and Signal Forms for driver/type/plate/color/year/capacity; map `produnctionYear` explicitly and preserve drafts on mutation failure.
[ ] VEHICLE-07 Reuse driver search, upload, numeric and choice controls; confirm preserve/replace/remove behavior for vehicle photograph, smart card, insurance and vehicle-card images without inferring approval.
[x] VEHICLE-08 Compose TanStack Table v9 and Spartan vehicle lists with supported server filters/paging and accessible empty/error/loading states; refresh type choices after confirmed inline type creation.
[ ] VEHICLE-09 Prove vehicle and inline-type create-read-edit-read-delete roundtrips as supported by confirmed contracts; resolve missing write-company and document hydration contradictions without inventing type deletion APIs.
[ ] VEHICLE-10 Derive authorized scope without hardcoded company IDs or synthetic write fields; test direct URLs, company changes, server denial and driver ownership while keeping capacity informational until agreed.
[ ] VEHICLE-11 Register Tailwind library/Helm sources and semantic logical styles; verify mobile RTL/LTR, plate presentation, keyboard dialogs, upload labels and field-error focus.
[ ] VEHICLE-12 Verify the public feature in an alternate consumer with different mount paths, API configuration and destinations; preserve lazy boundaries and avoid panel-specific driver navigation.
[ ] VEHICLE-13 Add unit tests for wire adapters, vehicle/type ID distinctions, optional numeric values, all picture modes, store races, inline-type failure and confirmed validation without invented capacity constraints.
[ ] VEHICLE-14 Run discovered targets via Bun/Nx and browser/accessibility CRUD tests including failed edits and scope switches; verify protected client rendering, SSR/hydration isolation and private transfer-cache policy.
[x] VEHICLE-15 Record implementation and verification evidence before marking completion; distinguish fixture coverage from approved non-production API acceptance and leave capacity/service-history policy visibly unresolved.

## Evidence Placeholder

Implemented reusable libraries at `libs/transport/vehicles/data-access` and `libs/transport/vehicles/feature`, with app composition under `apps/panel/src/app/vehicles`. Read-only legacy evidence confirmed `/v1/vehicle/search` (POST), `/v1/vehicle/:id` (GET/DELETE), `/v1/vehicle` (POST for add/update), and `/v1/vehicle/types` (GET/POST); the write DTO deliberately has no synthetic company field. The feature provides scoped SignalStore state, paged list/detail/editor routes, shared Driver API autocomplete, fetched car-type options plus inline creation/refresh, four document replacement controls, deletion confirmation and localized RTL/LTR content.

App vehicle, people and driver read adapters require Admin/Manager plus a ready, matching company context; the backend must independently authorize entity/company ownership for detail reads. Create/update/delete and car-type creation remain denied until Q02-Q08 ownership/history and image-clear semantics are approved. API fixtures cover search, detail, create/update/delete/type methods, denial-before-request, IDs, nullable metadata, plate validation and document preservation/replacement; they are not backend acceptance. Route-entry browser coverage asserts vehicle search on list entry, type lookups on create/edit entry, and driver autocomplete search. Passed data/feature tests, typechecks and lint; `shared-ui-forms:test`, `panel-e2e:typecheck/lint`, `panel:lint`, and the latest `panel:build` pass. Browser E2E could not run because Playwright browser executables are absent. No production calls, capacity enforcement, qualification approval, image removal, history policy or live-backend acceptance are claimed.
