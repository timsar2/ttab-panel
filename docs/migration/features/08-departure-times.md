# 08. Departure Times

[MainTODO](../TODO.md)

## Status And Scope

Status: PENDING; every task below is unimplemented in the target, regardless of legacy evidence.
LEGACY/CONTRACT: S12 exposes company, name, and `shiftTime` for named travel clock slots.
ShiftTime is not a work Shift and is not the Route's first-station `departureTime`.
TASK: migrate company-scoped maintenance and reusable lookups, not calendar generation or dispatch.

## Proposed Library Boundary

Reuse a suitable existing library or Bun/Nx-generate `libs/transport/scheduling/data-access` and `feature` boundaries.
Data-access owns DTOs, time/error adapters, API services, helpers, and route-scoped NgRx SignalStore state.
Feature owns all pages, standalone OnPush components, Signal Forms drafts, and a public route factory/configuration.
Use signals, TanStack Table v9, Spartan, and public aliases; no application imports or one Nx project per class.
Apps supply mount paths, authorized context, and configuration only; enforce Nx tags and Sheriff edges.

## Dependencies

Shared [controls](00-foundation-and-shared-controls.md), [access](01-authentication.md), and [company context](03-company-context-and-shell.md).
Consumers: [shifts](09-shift-groups-and-shifts.md), [routes](10-routes.md), and [lines](12-lines.md).

## Domain Gates

Q03-Q04 gate permissions and company URL behavior; Q13 gates clock/calendar/timezone conversion.
Q14 gates precedence between Route, Line, Shift, and displayed start/end times; do not infer equivalence.
Resolve these independently; confirmed slot CRUD need not wait for an executable schedule calendar.

## Pending Tasks

[ ] TIME-01 Confirm endpoint spelling, HTTP verbs, envelopes, lookup/detail IDs, paging, deletion references, and field-error contracts against the authoritative API.
[ ] TIME-02 Define typed read/write/search DTOs and pure clock/date/error adapters; distinguish clock strings from date instants and verify timezone-free round trips.
[ ] TIME-03 Reuse or Bun/Nx-generate the scheduling libraries after generator discovery/dry-run; register public aliases, Nx tags, and Sheriff ownership without app-owned feature code.
[ ] TIME-04 Export configurable lazy departure-time routes and lookup APIs with caller-supplied mount paths, endpoints, company context, and forbidden destinations.
[ ] TIME-05 Provide route-scoped NgRx SignalStore records, loading/save/error state, computed lookup options, and targeted invalidation after successful mutations.
[ ] TIME-06 Bind supported search, page, and sort filters to typed URL state and adapt TanStack Table v9 pagination to the confirmed server convention.
[ ] TIME-07 Cancel superseded reads and reject stale session/company/filter responses; clear sensitive records and selections on company switches and logout.
[ ] TIME-08 Implement explicit local Signal Forms drafts for company, name, and clock value with confirmed defaults and deliberate empty/omitted payload mapping.
[ ] TIME-09 Hydrate edit drafts once per record identity, retain user edits during refresh, preserve drafts on failure, and prevent duplicate saves.
[ ] TIME-10 Render accessible loading, empty, unavailable-reference, not-found, retry, field-error, and save-error states with invalid feedback only after blur/submission.
[ ] TIME-11 Reuse shared forms, clock controls, table, and Spartan dialogs; inspect installed CDK APIs including writable Directionality.valueSignal and verify keyboard behavior.
[ ] TIME-12 Implement confirmed create/read/update/delete flows with destructive confirmation and backend reference-conflict display rather than silently breaking Line or Shift references.
[ ] TIME-13 Publish scoped lookup contracts for Lines and Shifts without inventing precedence over Route departureTime or any work-day resolution policy under Q14.
[ ] TIME-14 Apply agreed role gates and require backend company/entity authorization for every read/write; a management menu or selected company is not access proof.
[ ] TIME-15 Unit-test DTO/time/error adapters, validators, store races, reference conflicts, and company changes using controlled API fixtures.
[ ] TIME-16 Test the public route factory and lookup API in an alternate consumer and different mount path with isolated providers and no imports from apps.
[ ] TIME-17 Browser-test CRUD, failures, keyboard overlays, RTL/LTR, mobile, and production rendering; verify protected SSR policy, no private transfer cache, and hydration safety if rendered.
[ ] TIME-18 Run discovered affected Bun/Nx test/lint/typecheck/build targets and record dated mocked versus live-backend evidence before any completion mark.

## Evidence Placeholder

Implementation: pending. Contract decisions: pending, with Q13/Q14 owner and date to record.
Verification: pending; attach commands, fixture/live scope, browser results, and unresolved gaps here.
