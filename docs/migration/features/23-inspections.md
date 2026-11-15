# Inspections TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** Admin/Manager-only company-shell screens and typed APIs are implemented
with controlled unit fixtures. The visit creation UI uses company-scoped Driver
and Vehicle search choices. No live backend, procedure-installation, or cross-entity
company validation is claimed.

## Architecture

- App composition and selected-company/session/language policy live in
  `apps/panel/src/app/inspection/inspection.routes.ts`.
- Reusable pages and route factory live in `libs/panel/inspection`.
- Inspection DTO validation, API, and session-scoped SignalStore live in
  `libs/transport/inspection/data-access`.
- The Inspection list intentionally uses the backend's global Admin/Manager search
  because the procedure has no company filter. The UI states that records are not
  filtered by the selected company. Selected-company context is used only for
  driver/vehicle lookup choices on visit creation.

## Tasks

[X] INSPECT-01 Generate nonbuildable transport and panel feature libraries with
public aliases, Nx tags, Analog test config, and approved dependency boundaries.
[X] INSPECT-02 Implement typed list/detail/search, visit creation, defect and
corrective-action adapters for the documented endpoints, IDs, dates and response
envelopes; do not model list `StatusTypeId` as a number.
[X] INSPECT-03 Implement a session-aware route-scoped SignalStore with independent
list/detail state, superseded reads, session cancellation and no invented totals.
[X] INSPECT-04 Mount a lazy selected-company route in the established app/library
boundary and restrict route affordances and API access adapters to Admin/Manager.
[X] INSPECT-05 Implement a paged/sorted list, detail, typed check display, company
driver/vehicle selection and visit insert form with all twelve required true/false
checks. Inspector identity comes from the backend session.
[X] INSPECT-06 Implement separate insert-only DueDate/required-action and
CompletedAt/completed-action forms. Display backend typed arrays as safe text.
[ ] INSPECT-07 Keep status/approval UI unavailable until actor authorization,
transitions and confirmation semantics are approved. API support alone is not a
product-approved transition workflow.
[X] INSPECT-08 Use allowlisted stable sorting and bounded paging; do not fabricate
counts, company filters, numeric status IDs, rowversion or optimistic concurrency.
[X] INSPECT-09 Add Chromium fixture acceptance for authorized/denied routes, lookup
requests, create/detail/action forms, RTL/LTR, mobile widths, keyboard navigation,
pending-submit guards, missing/empty data, and selected-company driver/vehicle
lookups. Fixtures do not establish live API/database readiness.
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
- Status values are 1 pending action, 2 pending approval, 3 approved. The endpoint
  does not enforce a transition state machine or an approver role beyond Admin/
  Manager route authorization, so the Panel has no status action control.
- Handoff notes report invalid Inspection DDL. No frontend verification can
  establish procedure deployment or database installation health.

## Verification Evidence

- Inspection API/model/store tests (19) cover exact list/detail/write/status paths, body fields,
  date-only validation, short/int bounds, all required Boolean fields, typed arrays,
  denied access and session-change cancellation.
- Panel tests (11) cover lazy route shape, ID parsing, initial list load, global-list
  disclosure, company lookup activation, all 24 explicit check radios, separate
  defect/corrective-action request bodies and route detail refresh behavior.
- The five Chromium E2E scenarios cover scoped Support denial, Support empty/missing,
  Support replies, Inspection role denial, and Inspection visit/action workflows.
- Production panel build passed with the existing initial bundle budget warning;
  the Authentication BFF reports disabled local configuration. No deployed API,
  database, browser workflow, or authorization result was verified.
