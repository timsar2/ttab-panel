# 21. Service Eligibility

[MainTODO](../TODO.md)

## Status And Scope

Status: PENDING, CONTRACT-GATED; this TASK-requested capability is not a working legacy function.
TASK T05/E7 expects transport corresponding to assigned Route, Line, and applicable work Shift.
LEGACY provides separate assignment/schedule inputs only; hasShift, a selected row, or telemetry does not grant eligibility.
No approved auto-generated Trips, capacity enforcement, dispatch, booking/check-in, or boarding algorithm is established.

## Proposed Library Boundary

Reuse suitable domain libraries or Bun/Nx-generate `libs/transport/eligibility/data-access` and `feature` after contract agreement.
Data-access owns typed decision contracts, services, pure date/error adapters, and route-scoped NgRx SignalStore state.
Feature owns pages, standalone OnPush components, signals, explicit Signal Forms query drafts, and public lazy route factory/configuration.
Use TanStack Table v9 and Spartan where justified; all pages/components/services/helpers remain in libraries with no app imports.
Use public aliases and Nx/Sheriff edges, not one Nx project per rule/class; apps only supply composition and configuration.

## Dependencies

[Scheduling](09-shift-groups-and-shifts.md), [times](08-departure-times.md), [lines](12-lines.md), [stations](13-stations.md), [drivers](14-driver-line-assignments.md).
[Bulk passengers](15-passengers-and-bulk-assignment.md), [station associations](16-station-passenger-assignments.md), [auth](01-authentication.md), [context](03-company-context-and-shell.md), [controls](00-foundation-and-shared-controls.md).

## Domain Gates

Q06 defines dated service/Trip identity; Q07-Q09 define resource links, any capacity/readiness policy, and Line/Station membership.
Q12-Q14 define type IDs, cycle units/precedence, startDate, holidays/offShift/night/timezone behavior, and clock precedence.
Q15-Q18 define date boundaries/history, optional Line, partial assignments, and bulk/individual reconciliation; Q19 defines any exceptions or execution workflows.
Resolve gates independently; upstream confirmed CRUD stays unblocked, but no missing decision input may silently become permission to travel.

## Pending Tasks

[ ] ELIG-01 Obtain product/backend approval for eligibility use cases and decision authority under T05, explicitly separating TASK requirements from legacy input contracts and unapproved recommendations.
[ ] ELIG-02 Resolve Q06 service-date/Trip identity and authoritative endpoint ownership before wiring decisions; do not infer service instances or auto-generate Trips from DriverLine or telemetry IDs.
[ ] ELIG-03 Resolve Q12-Q14 with approved fixed/rotating type IDs, cycle units, startDate, holiday/offShift/night and time-precedence examples before any date-to-Shift algorithm.
[ ] ELIG-04 Resolve Q15-Q18 effective-date boundaries, overlap/history, omitted-Line meaning, partial assignment repair, and bulk/individual reconciliation with independently recorded gate approvals.
[ ] ELIG-05 Resolve Q07-Q09/Q19 only for required decision inputs and exceptions; leave capacity, resource readiness, dispatch, check-in, and one-way/return enforcement out unless explicitly approved.
[ ] ELIG-06 Confirm API verbs, decision request/response, reason identifiers, versions/as-of semantics, unavailable versus denied outcomes, envelopes, and field/error contracts before implementing access.
[ ] ELIG-07 Define typed decision/input DTOs and date/clock/error adapters with explicit calendar/timezone semantics, incomplete-input representation, and no invented eligibility rules.
[ ] ELIG-08 Reuse or Bun/Nx-generate approved library boundaries with public aliases, Nx/Sheriff edges, and library-owned pages/components/services/helpers instead of app-owned implementation.
[ ] ELIG-09 Export configurable lazy eligibility routes and providers with caller API prefix, mount path, authorized company context, and error/denial navigation; avoid concrete app imports.
[ ] ELIG-10 Provide route-scoped NgRx SignalStore query/results/errors using signals; key decisions by session/company/passenger/service/date and confirmed contract version rather than list-membership cache.
[ ] ELIG-11 Bind approved passenger/service/date and supported table filters/page/sort to typed URL state; cancel old reads and reject stale company, assignment, schedule, or query responses.
[ ] ELIG-12 Build explicit local Signal Forms query drafts with confirmed non-null defaults, date adapters, touched/submitted errors, preserved failure drafts, and duplicate-request protection.
[ ] ELIG-13 Display authoritative outcome and reasons with distinct loading/unknown/incomplete/denied/error states; never present transport entitlement when the contract or required inputs are unresolved.
[ ] ELIG-14 Reuse shared forms, date/lookups, TanStack Table v9 where tabular results exist, and Spartan/current-CDK-compatible controls including Directionality.valueSignal and keyboard support.
[ ] ELIG-15 Apply Q01/Q03-Q04 identity/role/company gates and backend authorization for decisions and source data; a frontend allow result must not replace server enforcement.
[ ] ELIG-16 Unit-test approved decision fixtures, DTO/date/error adapters, unknown/error handling, stale invalidation, and boundary dates; test the public API with an alternate consumer and mount path.
[ ] ELIG-17 Browser-test approved outcomes, incomplete contracts, races, access denial, RTL/LTR mobile and keyboard; verify protected SSR policy, no private transfer cache, and hydration readiness if rendered.
[ ] ELIG-18 Run discovered affected Bun/Nx targets and production build after implementation; record approved policy fixtures versus live decision acceptance, remaining gates, and no completion claims from upstream CRUD alone.

## Evidence Placeholder

Contract gate register: pending; record each QID, decision owner/date, approved examples, and independently released scope.
Implementation/verification: pending; attach commands, browser artifacts, mocked/live boundaries, and explicit unapproved exclusions.
