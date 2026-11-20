# Inspections TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** Admin/Manager Panel list/detail/review and the standalone Inspector
login/create/own-detail flow are implemented with controlled fixtures. Visit
creation uses company-scoped Driver/Vehicle lookups. No live API, procedure
installation, Inspector status readback, or cross-entity company validation is claimed.

## Architecture

- Inspector app auth/BFF/session/company lookup adapters live in
  `apps/inspection/src/app`; Admin/Manager selected-company adapters live in
  `apps/panel/src/app/inspection/inspection.routes.ts`.
- Inspector visit/detail UI lives in the independent `libs/inspection/feature/inspector`
  library. Admin/Manager list/detail UI stays in the Panel-scoped
  `libs/panel/inspection` library.
- Inspection DTO validation, API, and session-scoped SignalStore live in
  `libs/transport/inspection/data-access`.
- The Inspection list intentionally uses the backend's global Admin/Manager search
  because the procedure has no company filter. The UI states that records are not
  filtered by the selected company. Selected-company context is used only for
  driver/vehicle lookup choices on visit creation.

## Tasks

[X] INSPECT-01 Generate nonbuildable transport, Inspector feature, and Panel feature
libraries with public aliases, Nx tags, Analog test config, and approved boundaries.
[X] INSPECT-02 Implement typed list/detail/search, visit creation, defect and
corrective-action adapters for the documented endpoints, IDs, dates and response
envelopes; do not model list `StatusTypeId` as a number.
[X] INSPECT-03 Implement a session-aware route-scoped SignalStore with independent
list/detail state, superseded reads, session cancellation and no invented totals.
[X] INSPECT-04 Mount lazy Inspector-role routes in `apps/inspection` and separate
Admin/Manager routes in the Panel. Keep Inspector detail behind server-enforced
ownership; keep Panel affordances separate.
[X] INSPECT-05 Implement the Admin/Manager paged list/detail and the Inspector
company-scoped Driver/Vehicle visit form with all twelve required true/false checks.
Inspector identity comes from the backend session.
[X] INSPECT-06 Implement separate insert-only DueDate/required-action and
CompletedAt/completed-action forms. Display backend typed arrays as safe text.
[X] INSPECT-07 Implement the Admin/Manager status selector for IDs 1 (pending action),
2 (pending approval), and 3 (approved), with explicit confirmation. The Panel warns
that the backend does not enforce transitions or accept a status description. Inspector
status display remains blocked because detail does not return status.
[X] INSPECT-08 Use allowlisted stable sorting and bounded paging; do not fabricate
counts, company filters, numeric status IDs, rowversion or optimistic concurrency.
[X] INSPECT-09 Add Chromium fixture acceptance for authorized/denied routes,
create/detail, selected-company Driver/Vehicle lookup, RTL/LTR and mobile widths,
keyboard focus, and duplicate-submit protection. Broader API failure/empty-state and
live acceptance remain separately tracked; fixtures do not establish database readiness.
[ ] INSPECT-10 Verify live database procedure names/schema, server-side company and
driver/vehicle relationship validation, and staging authorization before live
acceptance. The frontend must not modify schema or claim these checks exist.

## Known Backend Limits

- Inspection list paging is one-based and has no total count, company, inspector,
  driver or status filters. The Panel uses a next-page heuristic from page length.
- `StatusTypeId` is a status display name string in list output; detail has no
  numeric status or rowversion.
- Visit creator identity is server-derived. The backend validates positive driver
  and vehicle IDs but does not validate company membership or that the two belong
  together. UI lookups are selected-company scoped but are not a server security
  boundary.
- Required actions and completed corrective actions are separate append-only rows;
  corrective actions are not linked to a specific defect.
- Status values are 1 pending action, 2 pending approval, 3 approved. The Panel has
  a confirmed Admin/Manager status selector, but the endpoint does not enforce a
  transition state machine or accept a status description. Inspector detail cannot
  display the committed status because the detail API omits it.
- Handoff notes report invalid Inspection DDL. No frontend verification can
  establish procedure deployment or database installation health.

## Verification Evidence

- Inspection API/model/store tests (19) cover exact list/detail/write/status paths, body fields,
  date-only validation, short/int bounds, all required Boolean fields, typed arrays,
  denied access and session-change cancellation.
- Panel tests (11) cover lazy route shape, ID parsing, initial list load, global-list
  disclosure, company lookup activation, all 24 explicit check radios, insert-only
  maintenance bodies and confirmed Admin status writes.
- Inspector app tests cover portal `/login`, environment selection, role-gated routes
  and the independent feature route factory. Two Chromium E2E scenarios mock the
  cookie-login response, scope, lookups and create/detail; six Panel Chromium scenarios
  cover lists, Admin status, replies, scoped denial, RTL/mobile and empty/missing states.
- Production builds passed with existing initial-bundle budget warnings. The local
  Auth BFF/database deployment was not used for fixture tests; no live API, procedure
  or database acceptance is claimed.
