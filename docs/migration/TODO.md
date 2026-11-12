# Panel Migration: Main TODO List

Migrate the legacy `panel` frontend into `front/apps/panel` using reusable,
library-owned features. This file is the active migration index; the linked
feature files hold the detailed tasks. Creating this backlog does not implement
the pending business features.

## Mandatory Instructions for Every AI Agent

**Before implementation, the AI agent must read
`front/docs/BUSINESS_DOMAIN.md`:**
[Business Domain](../BUSINESS_DOMAIN.md). Respect its distinctions between new
implementation, legacy behavior, task requirements, open questions, and proposals.

**The new implementation must be modern and follow the architecture by reading
`front/apps/panel/ARCHITECTURE.md`:**
[Architecture and Feature Delivery](../../apps/panel/ARCHITECTURE.md).
Read [AGENTS.md](../../AGENTS.md), the
[project lessons skill](../../.agents/skills/ttab-angular-workflow/SKILL.md), and
applicable Angular, Nx, and Spartan skills before the affected work.

### Non-Negotiable Implementation Contract

- Generate every new feature, page, component, layout, service, guard, and utility
  within an appropriate Nx library. Reuse an existing library when it owns the
  capability; do not create an Nx project per trivial class without a real boundary.
- Create new app features/pages under `libs/<app>/<feature>` (for example,
  `libs/panel/dashboard` or `libs/panel/people`). Feature components belong in
  `ui` folders owned by Nx libraries. Shared domain data can remain in reusable
  transport libraries; older proposed feature paths do not override this placement.
- Do not create new feature/page/component implementations under `apps/panel`.
  Applications own bootstrap, provider/configuration adapters, route mounting,
  deployment settings, branding, and styles/source registration only.
- Keep public providers, routes, UI, DTO adapters, stores, helpers, and layouts
  reusable by another application. Libraries must not import `apps/*` or hardcode
  panel paths, selected companies, branding, endpoints, or tenant credentials.
- Use Bun and Nx, standalone OnPush Angular, signals, Signal Forms, NgRx Signal
  Store, installed TanStack Table v9 APIs, and Spartan Helm/Brain UI primitives.
- Inspect existing implementations and generator help/source; load the Nx
  generation skill and dry-run before generating code. Register both Nx tags and
  Sheriff mappings without blanket boundary exceptions.
- Preserve zoneless behavior, RTL/LTR, accessible errors/focus/touch targets,
  private-data isolation, safe SSR/client-rendering boundaries, and real lazy UI.
- Do not copy legacy defects, hardcoded demos, production endpoints, embedded
  keys, unscoped caches, or unsupported assumptions as intended business behavior.
- Resolve a feature's contract gates before implementing the uncertain behavior.
  Continue unrelated, source-backed work without inventing missing policy.

Proposed library paths in feature files are targets, not existing packages.
Generate a boundary when its first real implementation is needed; do not scaffold
all proposed libraries as empty placeholders.

## Tracking Rules

Every task occupies one physical line beginning with `[ ]` or `[X]`, followed by
a stable task ID. Use `[ ]` for pending, partial, blocked, or unverified work.
Use `[X]` only after implementation and required verification are complete.

Update the feature file first, then its matching main task. A main task stays
unchecked while any task in that feature remains open. Record blockers, decision
owners, evidence, and remaining acceptance gaps in that feature's evidence section;
do not invent another status marker or mark work complete based on intent.

Existing checked tasks record the previously delivered and verified foundation,
not a fresh rerun during backlog creation. Recheck affected behavior when changing
it. Legacy implementation alone never earns a completed migration checkbox.
Use the feature files as the task-status source of truth; the older
[migration plan](../../FEATURE-MIGRATION-PLAN.md) remains planning history and
[theme checklist](../../CORE-THEME-TASKS.md) retains earlier validation evidence.

## Completed Planning

[X] PLAN-01 Analyze the legacy domain and record confirmed behavior, requirements, discrepancies, and open questions in BUSINESS_DOMAIN.md.
[X] PLAN-02 Document the modern architecture and reusable delivery contract for panel and future applications.
[X] PLAN-03 Create and validate all linked feature checklists, task markers, dependencies, and inherited completion states.

## Main Feature TODO List

[ ] M00 Complete [foundation and shared controls](features/00-foundation-and-shared-controls.md), including typed transport adapters and TanStack/Spartan table primitives.
[ ] M01 Complete [authentication](features/01-authentication.md), preserving delivered cookie-BFF/SSR session guards and finishing recovery, deployment, and live acceptance gates.
[X] M02 Preserve the delivered [theme and preferences](features/02-theme-and-preferences.md) baseline as reusable libraries.
[ ] M03 Complete [company context and protected shell](features/03-company-context-and-shell.md) as reusable libraries with authorized route-owned scope.
[ ] M04 Complete [company management](features/04-companies.md).
[ ] M05 Complete [people management](features/05-people.md), distinct from login-account permissions and passenger allocation.
[ ] M06 Complete [driver management](features/06-drivers.md). Angular 22 list, detail, add/edit flows and controlled verification are implemented; Operator entity scoping, document removal/deletion policy and live backend acceptance remain gated.
[ ] M07 Complete [vehicle management](features/07-vehicles.md).
[ ] M08 Complete [departure-time management](features/08-departure-times.md).
[ ] M09 Complete [shift groups and shifts](features/09-shift-groups-and-shifts.md), with agreed fixed/rotating schedule semantics.
[ ] M10 Complete [Route management](features/10-routes.md), preserving the distinction between Route, Line, and Station.
[ ] M11 Complete [Route pricing and absence penalties](features/11-route-pricing.md) after contract and monetary-policy clarification.
[ ] M12 Complete [Line management](features/12-lines.md).
[ ] M13 Complete [Station management and ordering](features/13-stations.md).
[ ] M14 Complete [Driver-Line assignments](features/14-driver-line-assignments.md).
[ ] M15 Complete [passengers and bulk assignments](features/15-passengers-and-bulk-assignment.md).
[ ] M16 Complete [Station-Passenger assignments](features/16-station-passenger-assignments.md).
[ ] M17 Complete [maps and geography](features/17-maps-and-geography.md) with approved providers and real scoped data.
[ ] M18 Complete [realtime tracking](features/18-realtime-tracking.md), not merely notification receipt or static markers.
[ ] M19 Complete [support requests](features/19-support-requests.md), without treating them as bookings.
[ ] M20 Complete the [operational dashboard](features/20-dashboard.md) using approved real capabilities, not hardcoded analytics.
[ ] M21 Resolve and deliver [service and passenger eligibility](features/21-service-eligibility.md) only against approved rules/contracts.
[ ] M22 Complete [cross-feature parity and release acceptance](features/22-release-and-parity.md).

## Delivery Order and Dependency Gates

| Stage | Work                                                                                           | Acceptance Milestone                                                                        |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | Existing auth plus minimal company API, context, protected shell, and first real company table | Login -> authorized company selection -> company workspace -> logout.                       |
| 2     | Companies, people, drivers, vehicles, and just-in-time shared controls                         | Scoped CRUD round trips, uploads, lookups, and context changes work without stale records.  |
| 3     | Departure times and scheduling; Routes, Lines, Stations, and pricing                           | Distinct transport/schedule concepts have verified forms, contracts, and nested navigation. |
| 4     | Driver-Line and passenger associations; gated service rules                                    | Correct dated assignments without fabricated capacity, rotation, or eligibility policies.   |
| 5     | Approved maps, notification lifecycle, support, tracking, and dashboard                        | Real scoped operations and vehicle correlation replace demo/stub behavior.                  |
| 6     | Cross-feature acceptance and staging evidence                                                  | Permissions, privacy, reliability, accessibility, and backend parity are verified.          |

Dependency links identify required capabilities, not a requirement to finish an
entire large checklist first. Build the company table and shared-table extraction
as one vertical slice. Company selection needs a safe company read API, not all
company CRUD. Numeric coordinate entry need not wait for a map-provider decision.
Resolve scheduling/eligibility questions early, but do not block unrelated CRUD
on hypothetical Trip, billing, booking, or analytics features.

## Definition of Done for Every Feature

[ ] DONE-01 Implement the feature and all new components inside generated reusable Nx libraries with public APIs and no app imports.
[ ] DONE-02 Verify typed backend contracts, normalized IDs/dates/errors, authorized company scope, and supported paging/filter behavior.
[ ] DONE-03 Verify scoped stores, cancellation/stale-response handling, duplicate-save prevention, draft retention, and mutation invalidation.
[ ] DONE-04 Verify explicit Signal Forms and reused Spartan/TanStack compositions with loading, empty, error, and access-denied states.
[ ] DONE-05 Verify alternate consumer configuration and mount paths, library boundaries, true lazy loading, and matching server-rendering policy.
[ ] DONE-06 Run affected Bun/Nx unit tests, lint, type checks where configured, consumer production build, and browser acceptance tests.
[ ] DONE-07 Check RTL/LTR, mobile, keyboard/focus semantics, theme/density compatibility, hydration, and sensitive-state cleanup.
[ ] DONE-08 Record fixture versus live-backend evidence, resolve feature gates, update detailed checkboxes, and synchronize the matching main checkbox.

The DONE tasks are the final migration-wide sweep of this contract; apply the
same criteria during each feature rather than waiting for the release stage.
Do not generate fake sessions, metrics, positions, approvals, or eligibility
answers to make an acceptance flow appear complete.
