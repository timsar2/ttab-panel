# Drivers

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: existing-person selection/registration, driver extension details, licence level, document images, and driver CRUD.
Legacy driver forms and previews are reference evidence, not migrated completion or proof of qualification, approval, expiry checks or availability.
Required reading and shared delivery rules are inherited from the main TODO; dated line allocation remains a separate workflow.

## Mandatory Library Boundary

Implementation boundaries: `libs/transport/drivers/data-access` and `libs/panel/drivers`, consuming public people APIs and following the current app-feature placement contract.
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

[X] DRIVER-01 Confirm driver search/detail/create/update/delete and person-detail contracts by read-only source/schema inspection, including shared IDs, envelopes and image payloads; make no production calls.
[ ] DRIVER-02 Resolve Q01-Q05/Q07/Q08 identity, company, retention and document-policy gates with authoritative evidence; retain code-matching field types and avoid invented qualification or date rules.
[X] DRIVER-03 Inspect reuse boundaries and Nx generator help, dry-run then generate needed driver libraries with Bun/Nx; locate wizard, list and form components in libraries and export public config/providers/routes.
[X] DRIVER-04 Register aliases, Nx scope/type tags, exact allowed dependency edges and Sheriff mappings; enforce public people imports and keep data-access independent of apps, UI and navigation.
[X] DRIVER-05 Add route-scoped NgRx SignalStore state keyed by session/company/person-driver ID/filter/page; cancel stale person/driver reads and invalidate only affected records after mutations.
[ ] DRIVER-06 Build standalone OnPush wizard steps using local signals and Signal Forms; retain selected Person identity, fully hydrate driver fields once, and preserve dirty drafts after failed submissions.
[ ] DRIVER-07 Reuse people search/registration and shared upload/choice controls through typed APIs; implement confirmed preserve/replace/remove semantics for national-card, licence and smart-card pictures.
[X] DRIVER-08 Compose the shared TanStack DataTable wrapper pattern and Spartan driver list with supported server filters/paging, explicit page-index adaptation and accessible loading/empty/error states.
[ ] DRIVER-09 Prove create-read-edit-read-delete roundtrips for Person-backed driver extensions; resolve incomplete licence/document hydration and the national-ID-only wizard gate rather than treating them as intended policy.
[ ] DRIVER-10 Enforce configured authorized company context without hardcoded company IDs; test existing Person selection, inaccessible IDs, logout/switch races and server denial without granting login access.
[ ] DRIVER-11 Register Tailwind sources and use semantic logical styling with Spartan controls; verify mobile RTL/LTR wizard flow, focus restoration, image alternatives and actionable field errors.
[ ] DRIVER-12 Mount the public driver feature in an alternate consumer with different paths/configuration and callbacks; verify people integration and lazy loading without panel imports or fixed destinations.
[ ] DRIVER-13 Add unit tests for identity adapters, licence hydration, all picture preservation modes, wizard/form errors, scoped-store races and duplicate-mutation prevention with controlled HTTP fixtures.
[ ] DRIVER-14 Run discovered Bun/Nx targets and browser/accessibility tests for person-to-driver registration and edit failures; verify protected client rendering, SSR/hydration isolation and no private transfer cache.
[ ] DRIVER-15 Record implementation, contract decisions and acceptance evidence before completion; keep unresolved document policy explicit and distinguish mocked coverage from approved non-production backend verification.

## Contract Evidence

Implementation started 2026-11-12: source-backed list, Person-backed onboarding, detail/edit, typed adapters and scoped SignalStore. Live access, destructive operations and unresolved document removal remain explicitly gated; completion evidence will follow validation.

Read-only inspection of legacy S07/S19 and `transport-backend/src/Host/Controllers/Providers/Drivers/DriversController.cs`, `Core/Application/Providers/Drivers/{DriverDto,DriverDetailsDto,SetDriverRequest,GetDriverRequest}.cs` confirms:

- Search is `POST v1/drivers/search` with company/name/national-ID and one-based page fields; detail is `GET v1/drivers/{id}`; create/update is the same `POST v1/drivers` upsert.
- Driver ID is the persisted Person business ID. Driver detail contains licence and four document URLs, not Person identity/contact data or proof of company membership. Person detail must be fetched separately through the configured People API.
- Upsert also assigns the linked Identity Driver role. Person creation separately creates an Identity account and queues welcome messages. Neither operation is enabled merely because a row or menu is visible.
- Licence values 1/2 are source-backed codes, not approved descriptive classifications. Preview URLs are read values; writes use optional structured base64 file objects.
- Omitted images preserve current documents. Removal is not exposed: backend file deletion and `newImage ?? oldImage` database fallback disagree. Delete is not exposed: retention/target-binding/short-ID concerns remain unresolved.
- Panel enables authenticated driver-list searches only for the resolved matching route company; backend search replaces non-admin company IDs with the authenticated claim. Driver details and writes remain denied in the panel pending per-entity ownership authorization. Person reads/writes remain independently gated.

No production API calls, document approval, operational readiness or live-backend acceptance are claimed.

## Verification Evidence

2026-11-12 controlled verification:

- Driver data-access: 40 tests passed, with lint and typecheck. Covers strict DTOs, identity matching, company/session cancellation and stale-result rejection, duplicate-save prevention, document keep/replace/reject-remove behavior, bounded payloads, null-response uncertainty and independently configured People/Drivers API URLs.
- Consumer tests: panel tests passed (16), including four direct unauthenticated driver routes; panel and panel-e2e lint/typecheck targets passed. Existing E2E lint warnings and jsdom modern CSS parsing diagnostics are not browser failures.
- Reused foundations: People data-access (139), shared forms (51), shared table (5), auth data-access (118), company data-access (56), departure-time data-access (88) and shell feature (4) tests and lint passed.
- Managed Chrome development driver route test passed. Managed Chrome production driver, people and departure-time route regressions passed (3). Tests cover explicit access denial without private requests, legacy redirects, reload privacy, logout, and 375px RTL/LTR overflow/touch targets. These panel tests intentionally do not claim authorized mutation coverage.
- Production build passed. Driver provider/route configuration is behind an app-owned lazy import; initial payload is 492.43 kB, below the existing 500 kB warning budget. A concurrent shared-layout CSS warning remains outside this feature.

- Independent design evaluation: PASS using an isolated, explicitly authorized consumer of the real public route factory and application styles. Chrome list/onboarding/detail/edit was inspected at 1440, 768 and 375px, including required validation, keep-editing navigation cancellation, fixture save-to-detail, stored document preview and RTL; no runtime errors or page-level overflow. Evidence and desktop/mobile screenshots are under `C:/Users/mrg/AppData/Local/Temp/kilo/driver-eval-*`; evaluation `driver-feature-eval-1.md`. This is controlled fixture evidence, not live company authorization or production backend acceptance.

- Follow-up list implementation: exported reusable signal-based `AutocompleteSearch<T>` from `@org/ui-forms`; input is ARIA combobox/listbox with keyboard selection, clear, pending/loading/no-result states, configurable labels and debounce. Driver route binds it to URL-backed name/National-ID server search and scopes suggestions to matching responses to avoid stale options. Selecting a driver searches by its national ID and updates the result list.
- Driver-specific `DriverTable` composes the existing shared TanStack `DataTable` with reusable columns, linked names, server paging and per-row View/Edit actions (edit remains permission-gated). Shared data-table remains the generic primitive for other pages. Destructive row actions remain omitted because backend retention/ownership concerns are unresolved.
- Latest verification: `panel-drivers:test` 17 passed; `shared-ui-forms:test` 54 passed; both libraries lint and typecheck passed. Chrome production driver route test passed, including autocomplete query URL, explicit access denial, no private requests, logout protection and 375px RTL/LTR touch target/overflow. Production build passed at 493.37 kB initial JS; remaining 4.14 kB stylesheet budget warning is in the concurrent shared layout, outside driver list.

2026-11-12 initial-load correction: the SignalStore effect already dispatched its first page search, but app composition supplied `access: () => () => of(false)`, so `DriversApi.run` denied it before issuing HTTP. The app now permits authenticated `search` only while the loaded CompanyContext matches the requested company ID. The backend search overwrites non-admin company IDs from the authenticated company claim. Detail/upsert and People API access remain denied. Controlled Chrome E2E verifies the initial `POST /api/v1/drivers/search` body `{ companyId: 2, fullName: null, nationalId: null, pageNumber: 1, pageSize: 10 }`, renders returned rows, filters again by name, and verifies direct detail/editor routes do not make unapproved private requests. Final panel build passed at 493.48 kB initial JS; shared-layout CSS budget warning remains unrelated.
