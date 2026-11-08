# 15. Passengers And Bulk Assignment

[MainTODO](../TODO.md)

## Status And Scope

Status: PENDING; legacy flows are not new implementation evidence.
LEGACY/CONTRACT S13: search existing passengers and submit passengerIds, shiftId, stationId, optional lineId, and fromDate.
Bulk selection does not create a Person; Passenger ID is not proven identical to Person or authenticated identity ID.
TASK T05 expects Route/Line/Shift association; legacy Line optionality and weak selected-ID-only validation are discrepancies, not approved policy.

## Proposed Library Boundary

Reuse or Bun/Nx-generate `libs/transport/assignments/data-access` and `feature` with related assignment workflows.
Data-access owns passenger/bulk DTOs, services, date/error helpers, and route-scoped NgRx SignalStores.
Feature owns pages, standalone OnPush components, signals, explicit Signal Forms drafts, and public lazy route factory/config.
Use TanStack Table v9 and Spartan public APIs; all pages/components/services/helpers belong to libraries, not apps.
Enforce Nx tags/Sheriff and no app imports; do not generate a separate Nx project for every class.

## Dependencies

[People](05-people.md), [shifts](09-shift-groups-and-shifts.md), [routes](10-routes.md), [lines](12-lines.md), [stations](13-stations.md).
[Station associations](16-station-passenger-assignments.md), [company context](03-company-context-and-shell.md), [auth](01-authentication.md), [controls](00-foundation-and-shared-controls.md).

## Domain Gates

Q01/Q05 gate identity and deletion; never copy legacy passenger removal that dispatches user/person deletion.
Q16 gates TASK-required versus legacy-optional Line; Q17 gates partially assigned search/repair; Q18 gates bulk/individual reconciliation.
Q09/Q13/Q15 gate compatible Station/Line relationships, calendar conversion, effective dates, overlap, and history.
Resolve gates independently; confirmed read/search work can proceed without inventing assignment or eligibility policy.

## Pending Tasks

[ ] PASSENGER-01 Confirm passenger search/detail and bulk endpoint contracts, IDs, flags, envelopes, paging, atomicity/partial failures, error payloads, and assignment-versus-person deletion semantics.
[ ] PASSENGER-02 Define typed passenger/search/bulk/result DTOs and date/error adapters with explicit omitted Line handling only after Q16 approval.
[ ] PASSENGER-03 Reuse or Bun/Nx-generate assignment libraries, registering public aliases, Nx/Sheriff edges, and library-owned feature pages, components, services, and helpers.
[ ] PASSENGER-04 Export configurable lazy passenger routes and provider APIs; keep API prefix, company context, navigation paths, and denied destinations consumer supplied.
[ ] PASSENGER-05 Scope NgRx SignalStore records, request/mutation errors, selection coordination, and invalidation to the route/company; do not duplicate server cache ownership.
[ ] PASSENGER-06 Bind confirmed hasShift/hasStation, search, parent Route, page, and sort filters to typed URL state; resolve Q17 truth tables for partial assignments instead of copying paired flags blindly.
[ ] PASSENGER-07 Cancel obsolete reads and reject stale session/company/filter/page responses; clear selected IDs and private records on company change or logout.
[ ] PASSENGER-08 Define TanStack Table v9 current-page select-all, cross-page retention, deselection, counts, and filter-change guards; never label one page as all matching passengers without backend support.
[ ] PASSENGER-09 Select existing passenger IDs only, verify scope and eligibility-to-submit with the backend, and link to People separately without introducing Person creation in bulk assignment.
[ ] PASSENGER-10 Build explicit local Signal Forms drafts for Shift, Station, Line, and fromDate plus selected-ID intent; gate Q16-required fields and reject the legacy weak-validation policy as an automatic default.
[ ] PASSENGER-11 Load Stations and Lines through the selected Route, reset/revalidate dependent choices, and confirm same-company/Route/Shift consistency without inventing Line-to-Station membership under Q09.
[ ] PASSENGER-12 Render untouched/touched/submitted field states, global and per-passenger errors, loading/empty/partial-assignment displays, and draft-preserving failures with duplicate-submit protection.
[ ] PASSENGER-13 Reconcile confirmed bulk success/partial success with scoped passenger and Station-Passenger invalidation under Q18; preserve retryable selected IDs without resubmitting known successes blindly.
[ ] PASSENGER-14 Reuse shared Signal Forms controls, date/lookups, Spartan dialogs, and current CDK-compatible selection controls including Directionality.valueSignal and accessible keyboard feedback.
[ ] PASSENGER-15 Enforce agreed roles and backend company/entity authorization; gate any removal behind Q05 and a confirmed passenger/association endpoint, never the legacy user deletion action.
[ ] PASSENGER-16 Unit-test adapters, required-field decisions, filter guards, cross-page selection, partial failures, and stale requests; test public routes/config in an alternate consumer at a different mount path.
[ ] PASSENGER-17 Browser-test existing-record bulk selection, denied/mixed failures, scope changes, RTL/LTR mobile, and keyboard; verify protected SSR/no-private-cache policy and hydration readiness if rendered.
[ ] PASSENGER-18 Run discovered affected Bun/Nx tests/lint/typecheck/build and record mocked versus live acceptance, Q16-Q18 decisions, and remaining unverified behavior before completion.

## Evidence Placeholder

Implementation and verification: pending; record dated commands, selected-ID scenarios, browser artifacts, and live gaps.
Decisions: pending for Q16 optionality, Q17 partial states, Q18 reconciliation, and Q05 safe removal.
