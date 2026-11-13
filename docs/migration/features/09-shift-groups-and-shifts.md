# 09. Shift Groups And Shifts

[MainTODO](../TODO.md)

## Status And Scope

Status: IN PROGRESS; a company-scoped CRUD slice exists in the new panel, but this feature is not complete or production-authorized.
LEGACY/CONTRACT S12: groups carry company, type, name, startDate, rateCycle, and holiday/day flags.
Shifts carry group, name, order, cycle, offShift, and outbound/return ShiftTime IDs; ShiftTime != Shift.
TASK T04 requires fixed and rotating schedules; neither an executable calendar nor dormant drag ordering is proven legacy functionality.

## Proposed Library Boundary

Reuse or Bun/Nx-generate shared `libs/transport/scheduling/data-access` and `feature` libraries with departure times.
Data-access owns typed contracts, services, date/error helpers, and group/shift route-scoped NgRx SignalStores.
Feature owns pages, standalone OnPush components, signals, explicit Signal Forms, and a public lazy route factory/config.
Use TanStack Table v9 and Spartan; all implementation lives in libraries, never apps or one Nx project per class.
Expose public aliases and caller configuration; enforce Nx/Sheriff boundaries without app imports.

## Dependencies

[Departure times](08-departure-times.md), [controls](00-foundation-and-shared-controls.md), [auth](01-authentication.md), [company context](03-company-context-and-shell.md).
Downstream: [passengers](15-passengers-and-bulk-assignment.md) and [eligibility](21-service-eligibility.md).

## Domain Gates

Q12 gates backend type-ID meanings, cycle units, and group-versus-shift precedence; do not hardcode fixed/rotating IDs.
Q13 gates holidays, offShift calendar meaning, night shifts, timezone, and startDate calendar conversion.
Q14 gates time-slot precedence; Q15 gates any derived assignment date-boundary/overlap behavior.
Resolve gates independently; confirmed configuration CRUD can proceed without inventing date-to-shift resolution.

## Pending Tasks

[ ] SHIFT-01 Confirm group/shift/type endpoints, verbs, parent IDs, envelopes, paging, order persistence, reference deletion, and backend field errors.
[ ] SHIFT-02 Define typed group/shift/type DTOs and date/clock/error adapters, preserving startDate and every day/holiday flag without interpreting their calendar effect.
[X] SHIFT-03 Reuse or Bun/Nx-generate scheduling ownership with public exports, Nx tags, and Sheriff mappings; keep pages, components, services, and helpers out of apps.
[X] SHIFT-04 Export configurable lazy group/shift routes with caller mount paths and providers; scope stores to company and group rather than global scheduling state.
[ ] SHIFT-05 Implement NgRx SignalStore loading/mutation/error state and typed URL group, filter, page, and sort parameters using signals and computed projections.
[ ] SHIFT-06 Cancel obsolete reads and reject stale session/company/group/filter results, including reused-route ID changes; reset selections on context changes.
[ ] SHIFT-07 Build explicit local group Signal Forms drafts for company, backend type lookup, name, startDate, rateCycle, and all flags with agreed validation/display rules.
[X] SHIFT-08 Build explicit local Shift drafts for group, name, order, cycle, offShift, and travel slots, with deliberate nullable/omitted value mapping.
[ ] SHIFT-09 Fix legacy edit omissions by hydrating existing cycle and offShift plus all references; avoid overwriting edited drafts on background loads.
[ ] SHIFT-10 Disable outbound/return controls and omit both IDs when offShift is submitted; verify switching back restores only valid draft choices without assigning calendar meaning.
[ ] SHIFT-11 Resolve Q12-Q14 with recorded backend/product examples for fixed/rotating types, startDate, cycle units, holidays, midnight, and time precedence before calendar logic.
[ ] SHIFT-12 Support only confirmed order editing; treat drag-and-drop as a separately approved enhancement, not legacy parity, and confirm reorder atomicity before adding it.
[ ] SHIFT-13 Reuse shared forms, TanStack Table v9, Spartan selectors/dialogs, and current CDK-compatible date controls; preserve Directionality.valueSignal and accessible keyboard behavior.
[ ] SHIFT-14 Show loading/empty/not-found, field and global errors, referenced-record delete conflicts, retry, and draft-preserving mutation failures; block duplicate submits.
[ ] SHIFT-15 Apply agreed role and company/group access gates with backend authorization; never derive transport permissions from the fallback operator menu.
[ ] SHIFT-16 Unit-test adapters, full edit hydration, offShift omission, scoped races, and contract-approved validation; test public routes in an alternate consumer at a different mount path.
[ ] SHIFT-17 Browser-test group/shift CRUD and failures, RTL/LTR mobile overlays, keyboard/focus, and protected SSR/no-private-cache policy; test hydration readiness if forms are server rendered.
[ ] SHIFT-18 Run discovered affected Bun/Nx checks and production build; record fixture versus live evidence and gate decisions without claiming calendar support from passing CRUD tests.

## Evidence Placeholder

Implementation and verification (2026-11-13): new libraries are `@org/transport-scheduling-data-access` and `@org/panel-shifts`; the app adapter is `apps/panel/src/app/feature/shift/`. The app navigation mounts `/client/:companyId/shift`, with `/add` and `/detail/:id` children. The company/group-scoped store, typed backend adapters, group-type/time lookups, Shift and Shift Group Signal Forms, and create-group dialog are implemented. Verified: library typechecks/lints, API decoder and route-factory unit tests, and the panel development build. These are local controlled checks, not a live backend/browser acceptance run.

Backend evidence: list handlers cap results at 1,000 without a total; Shift list DTO omits cycle, offShift and shift-time IDs, so editing uses the detail DTO after verifying the Shift Group belongs to the selected company's authorized group list. The detail endpoint is `[AllowAnonymous]`; the client rejects cross-company detail results, but this does not replace server-side authorization. Set-group and set-shift currently have no explicit role/ownership permission attributes. The new UI gates mutations to Admin/Manager, but API-side authorization remains required before production use. No date-to-shift/calendar interpretation was added.

Domain decisions: Q12-Q15 remain pending. Shift CRUD does not imply fixed/rotating calendar generation, holiday interpretation, timezone conversion, or travel-time precedence.
