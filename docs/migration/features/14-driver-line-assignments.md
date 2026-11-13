# 14. Driver-Line Assignments

[MainTODO](../TODO.md)

## Status And Scope

Status: PENDING; no legacy observation completes a target migration task.
LEGACY/CONTRACT S14: DriverLine links driverId, lineId, fromDate, and toDate; read models include Route/company metadata.
There is no Vehicle FK, Shift FK, or scheduled-service FK in the write contract.
TASK T02 coordination is broader than this association; do not introduce dispatch or historical vehicle inference as legacy behavior.

## Proposed Library Boundary

Reuse a suitable assignment boundary or Bun/Nx-generate `libs/transport/assignments/data-access` and `feature` libraries.
Data-access owns DriverLine DTOs, services, date/error helpers, and route-scoped NgRx SignalStore state.
Feature owns pages, standalone OnPush components, signals, explicit Signal Forms, and public lazy route factory/configuration.
Use TanStack Table v9 and Spartan with public library aliases, Nx tags, and Sheriff edges; never import apps.
Apps mount configured routes only; related assignments may share projects rather than one project per class.

## Dependencies

[Drivers](06-drivers.md), [routes](10-routes.md), [lines](12-lines.md), [auth](01-authentication.md), [company context](03-company-context-and-shell.md).
[Controls](00-foundation-and-shared-controls.md), [vehicles](07-vehicles.md), and downstream [eligibility](21-service-eligibility.md).

## Domain Gates

Q01-Q04 gate identities, company scope, and roles; Q05 gates deletion/history retention.
Q15 gates inclusive/exclusive date bounds, overlap legality, and replacement/closure; no exclusivity is proven.
Q06-Q08 gate any later service/vehicle/resource extension; resolve separately from confirmed DriverLine CRUD.
Q13 gates calendar/timezone conversion; a valid date range does not prove an available driver or operating vehicle.

## Pending Tasks

[ ] DRIVERLINE-01 Confirm search/detail/create/update/delete contracts, association IDs, verbs, envelopes, pagination, company derivation, and conflict/field-error responses.
[ ] DRIVERLINE-02 Define typed DriverLine read/write/search DTOs and date/error adapters with explicit date-only versus instant semantics and no invented Vehicle or Shift fields.
[ ] DRIVERLINE-03 Reuse or Bun/Nx-generate assignment libraries with public aliases, Nx/Sheriff ownership, and library-owned components, services, helpers, and feature routes.
[ ] DRIVERLINE-04 Export configurable lazy assignment routes and provider/config APIs with caller-supplied company context, API prefix, mount path, and denial destinations.
[ ] DRIVERLINE-05 Provide route-scoped NgRx SignalStore records, loading/save/error status, and targeted post-mutation invalidation rather than globally cached company lists.
[ ] DRIVERLINE-06 Synchronize supported Route, Line, driver, date, page, and sort filters with typed URL state and confirmed TanStack Table v9 server paging.
[ ] DRIVERLINE-07 Cancel superseded requests and reject stale session/company/Route/filter completions; clear sensitive selections on logout and company changes.
[ ] DRIVERLINE-08 Build explicit local Signal Forms drafts for driverId, lineId, fromDate, and toDate with a Route selector used only to obtain scoped Lines.
[ ] DRIVERLINE-09 Reset or revalidate Line when Route/company changes and validate lookup ownership server-side; never accept stale cross-company driver or Line selections.
[ ] DRIVERLINE-10 Fully hydrate edit drafts from association detail without clobbering edits; preserve drafts on failure and disable duplicate mutations.
[ ] DRIVERLINE-11 Resolve Q15 examples for same-day boundaries, adjacent assignments, overlaps, and replacement before enforcing inclusive ranges or exclusivity; display authoritative backend conflicts.
[ ] DRIVERLINE-12 Keep Vehicle and Shift assignment out of this CRUD payload and prevent UI claims that DriverLine identifies a historical vehicle or complete dated service.
[ ] DRIVERLINE-13 Reuse shared forms/date/lookups, TanStack Table v9, Spartan dialogs, and installed CDK-compatible controls with Directionality.valueSignal and keyboard/focus support.
[ ] DRIVERLINE-14 Implement loading/empty/not-found/forbidden, field/global errors, retry, and history-aware delete confirmation under Q05 without cascading person deletion.
[ ] DRIVERLINE-15 Apply agreed role gates and mandatory backend company/entity authorization for list, lookups, detail, mutation, and direct URLs.
[ ] DRIVERLINE-16 Unit-test DTO/date/error adapters, dependent selectors, draft hydration, request races, and approved boundary policies; test public API mounting in an alternate consumer/path.
[ ] DRIVERLINE-17 Browser-test CRUD, conflict/failure recovery, company switching, RTL/LTR mobile, and keyboard overlays; verify protected SSR policy, no private transfer cache, and hydration safety if rendered.
[ ] DRIVERLINE-18 Run discovered affected Bun/Nx verification targets and production build, recording mocked versus live results and independent Q15/resource-contract gate outcomes.

## Evidence

Implementation (2026-11-13): Unified the legacy `/client/:companyId/driver-line/detail/:id` route into the existing assignment form. A route-scoped `DriverLineState` restores company ID from the parent URL, assignment ID from `:id`, and `directionId` from the URL query; the selected direction is kept in the query string so reloads restore it. The detail API hydrates the editable form on initial load/refresh. Driver selection uses the shared People autocomplete/search store and validates the selected person through `DriversApi`. The feature remains at `libs/panel/feature/driver-line`; it posts `{ companyId, driverId?, pageNumber, pageSize }` to `v1/lines/search-driver`, reads `v1/lines/driver/:id`, posts assignments to `v1/lines/driver`, and loads company Directions and dependent Lines. It does not add Vehicle/Shift fields or infer date-overlap rules. A dedicated typed assignment data-access store, full runtime response decoding, delete workflow, and authorization contract are not yet delivered.

Contract decisions and owners: pending for Q01-Q05, Q13, Q15 and any resource extension. The panel currently limits writes and driver lookups to Admin/Manager; backend enforcement and read-role policy require confirmation.
Verification: `bun nx test panel-driver-line`, `bun nx lint panel-driver-line`, and `bun nx build panel --configuration=development` passed on 2026-11-13 after this refactor. Unit/build evidence only; no browser flow or live-backend acceptance was run.
