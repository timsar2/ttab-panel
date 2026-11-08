# 16. Station-Passenger Assignments

[MainTODO](../TODO.md)

## Status And Scope

Status: PENDING; the legacy surface is unreliable and is not target completion.
LEGACY/CONTRACT S15: individual associations use association ID, Passenger, Station, and fromDate.
Legacy add hardcodes company 22; edit restores only ID/date; neither defect is intended scope or update policy.
TASK: migrate confirmed association maintenance without assuming it is a separate passenger identity or a complete service assignment.

## Proposed Library Boundary

Reuse or Bun/Nx-generate `libs/transport/assignments/data-access` and `feature` alongside bulk assignment.
Data-access owns association DTOs, API services, date/error helpers, and station/route-scoped NgRx SignalStore state.
Feature owns pages, standalone OnPush components, signals, explicit Signal Forms, and a public lazy route factory/config.
Use TanStack Table v9, Spartan, public aliases, Nx tags, and Sheriff mappings without importing apps.
All pages/components/services/helpers remain library owned; sharing an Nx project across related classes is expected.

## Dependencies

[Stations](13-stations.md), [routes](10-routes.md), [passenger bulk](15-passengers-and-bulk-assignment.md), and [people](05-people.md).
[Company context](03-company-context-and-shell.md), [auth](01-authentication.md), and [shared controls](00-foundation-and-shared-controls.md).

## Domain Gates

Q18 gates association-versus-bulk persistence, IDs, history, and invalidation; resolve the legacy passengerId route parameter versus association-ID ambiguity.
Q01/Q03-Q05 gate identity, authorization, route scope, and deletion; Q13/Q15 gate dates, overlap, and replacement.
Station belongs to Route, not Line; Q09 gates any Line-specific membership assumption.
Resolve endpoint identity and safe CRUD independently; leave unsupported reconciliation/history operations gated.

## Pending Tasks

[ ] STATIONPASS-01 Confirm association list/detail/create/update/delete endpoints, verbs, envelopes, parent scoping, optional fields, paging, and backend field/conflict errors.
[ ] STATIONPASS-02 Resolve whether each legacy passengerId route segment identifies Passenger or association ID; publish distinct typed route parameters and test both navigation and API identity.
[ ] STATIONPASS-03 Define typed association read/write/search DTOs and date/error adapters with explicit Passenger versus association identities and deliberate null/omission handling.
[ ] STATIONPASS-04 Reuse or Bun/Nx-generate assignment library ownership with public aliases and Nx/Sheriff edges; keep every feature page/component/service/helper out of apps.
[ ] STATIONPASS-05 Export configurable lazy routes and providers accepting company/Route/Station context and mount paths, with no hardcoded company 22 or application imports.
[ ] STATIONPASS-06 Scope NgRx SignalStore records, loading/save/error state, and invalidation to session/company/Station; synchronize supported search/page/sort with typed URL filters.
[ ] STATIONPASS-07 Cancel superseded reads and reject stale company/Station/filter/page completions; clear selections and sensitive data on logout or reused-route context changes.
[ ] STATIONPASS-08 Build explicit local Signal Forms drafts for Passenger, Station, and fromDate; confirm parent Station locking versus editable selection and show agreed required-field feedback.
[ ] STATIONPASS-09 Fix incomplete legacy edit hydration by restoring association ID, Passenger, Station, and effective date; do not overwrite dirty drafts on detail refresh.
[ ] STATIONPASS-10 Derive authorized company from resolved context instead of a constant, validate Station-to-Route and Passenger scope server-side, and reject mismatched direct URLs.
[ ] STATIONPASS-11 Resolve Q18 create/update/history interactions with bulk assignment and invalidate only confirmed shared projections; do not claim both endpoints update identical persistence.
[ ] STATIONPASS-12 Gate inclusive dates, overlaps, replacement, and historical edits on Q13/Q15; keep approved association CRUD separate from eligibility/calendar calculations.
[ ] STATIONPASS-13 Implement association-only destructive confirmation under Q05, display reference/history conflicts, and never dispatch Person/user deletion for removing a station association.
[ ] STATIONPASS-14 Reuse shared forms/lookups/date controls, TanStack Table v9, Spartan dialogs, and installed CDK-compatible controls preserving Directionality.valueSignal and keyboard/focus behavior.
[ ] STATIONPASS-15 Render loading/empty/not-found/forbidden, field/global errors, retry, and draft-preserving mutation failures; block duplicate saves and require agreed roles plus backend authorization.
[ ] STATIONPASS-16 Unit-test route identity, DTO/date/error adapters, complete edit hydration, context races, and Q18 invalidation; mount public routes in an alternate consumer with a different path/configuration.
[ ] STATIONPASS-17 Browser-test add/edit/delete and failure recovery without company 22, RTL/LTR mobile and keyboard overlays; verify protected SSR/no-private-cache policy and hydration safety if rendered.
[ ] STATIONPASS-18 Run discovered affected Bun/Nx verification targets and production build; record dated fixture/live evidence and independently resolved identity/reconciliation gates before completion.

## Evidence Placeholder

Implementation: pending; record association-ID route decision and Q18 contract owner/date here.
Verification: pending; attach commands, browser artifacts, alternate-consumer results, and remaining live-backend gaps.
