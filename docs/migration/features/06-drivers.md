# Drivers

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: existing-person selection/registration, driver extension details, licence level, document images, and driver CRUD.
Legacy driver forms and previews are reference evidence, not migrated completion or proof of qualification, approval, expiry checks or availability.
Required reading and shared delivery rules are inherited from the main TODO; dated line allocation remains a separate workflow.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/drivers/data-access` and `libs/transport/drivers/feature`, consuming public people APIs.
Generate new feature libraries with Bun/Nx; all driver pages, wizard steps and forms belong in appropriate existing/generated libraries, not `apps/panel`.
Expose public typed configuration, scoped providers and a lazy route factory; no app imports, fixed mount paths or app-owned stores in libraries.
The app stays thin bootstrap/provider/routing composition; do not require one project per component or couple data-access to presentation.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), and [people](05-people.md).
Coordinate with [vehicles](07-vehicles.md), [driver-line assignments](14-driver-line-assignments.md), and [release parity](22-release-and-parity.md).

## Contract And Business Gates

Domain references: C3, E2, F1 L02/L12, G, J1 Q01-Q05 and J2 Q07/Q08; primary evidence S07 and S19.
Driver is a business Person extension: legacy selected user/Person ID is the Driver ID, not proof of authenticated-login identity equivalence (Q01).
Q02-Q05 gate membership, access and deletion/history; Q07/Q08 gate historical vehicle association, licence meanings and document policy.
Licence values 1 and 2 have no established business labels; do not invent approval, expiry, exclusivity or availability constraints.
Legacy edit incompletely hydrates licence/documents; a preview is not a hydrated upload value, and null/empty image preserve/clear semantics are unresolved.

## Pending Tasks

[ ] DRIVER-01 Confirm driver search/detail/create/update/delete and person-detail contracts by read-only source/schema inspection, including shared IDs, envelopes and image payloads; make no production calls.
[ ] DRIVER-02 Resolve Q01-Q05/Q07/Q08 identity, company, retention and document-policy gates with authoritative evidence; retain code-matching field types and avoid invented qualification or date rules.
[ ] DRIVER-03 Inspect reuse boundaries and Nx generator help, dry-run then generate needed driver libraries with Bun/Nx; locate wizard, list and form components in libraries and export public config/providers/routes.
[ ] DRIVER-04 Register aliases, Nx scope/type tags, exact allowed dependency edges and Sheriff mappings; enforce public people imports and keep data-access independent of apps, UI and navigation.
[ ] DRIVER-05 Add route-scoped NgRx SignalStore state keyed by session/company/person-driver ID/filter/page; cancel stale person/driver reads and invalidate only affected records after mutations.
[ ] DRIVER-06 Build standalone OnPush wizard steps using local signals and Signal Forms; retain selected Person identity, fully hydrate driver fields once, and preserve dirty drafts after failed submissions.
[ ] DRIVER-07 Reuse people search/registration and shared upload/choice controls through typed APIs; implement confirmed preserve/replace/remove semantics for national-card, licence and smart-card pictures.
[ ] DRIVER-08 Compose a TanStack Table v9 and Spartan driver list with supported server filters/paging, explicit page-index adaptation and accessible loading/empty/error states.
[ ] DRIVER-09 Prove create-read-edit-read-delete roundtrips for Person-backed driver extensions; resolve incomplete licence/document hydration and the national-ID-only wizard gate rather than treating them as intended policy.
[ ] DRIVER-10 Enforce configured authorized company context without hardcoded company IDs; test existing Person selection, inaccessible IDs, logout/switch races and server denial without granting login access.
[ ] DRIVER-11 Register Tailwind sources and use semantic logical styling with Spartan controls; verify mobile RTL/LTR wizard flow, focus restoration, image alternatives and actionable field errors.
[ ] DRIVER-12 Mount the public driver feature in an alternate consumer with different paths/configuration and callbacks; verify people integration and lazy loading without panel imports or fixed destinations.
[ ] DRIVER-13 Add unit tests for identity adapters, licence hydration, all picture preservation modes, wizard/form errors, scoped-store races and duplicate-mutation prevention with controlled HTTP fixtures.
[ ] DRIVER-14 Run discovered Bun/Nx targets and browser/accessibility tests for person-to-driver registration and edit failures; verify protected client rendering, SSR/hydration isolation and no private transfer cache.
[ ] DRIVER-15 Record implementation, contract decisions and acceptance evidence before completion; keep unresolved document policy explicit and distinguish mocked coverage from approved non-production backend verification.

## Evidence Placeholder

Not completed. Public exports, contract decisions, test commands/results, browser/accessibility captures, alternate-consumer and client/SSR evidence: pending.
No production calls, document approval, operational readiness or live-backend acceptance are claimed from legacy S07/S19.
