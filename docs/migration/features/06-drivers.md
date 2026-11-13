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
[X] DRIVER-06 Build standalone OnPush wizard steps using local signals and Signal Forms; retain selected Person identity, fully hydrate driver fields once, and preserve dirty drafts after failed submissions.
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

Implemented: source-backed list, Person-backed onboarding, detail/edit, typed adapters and scoped SignalStore. Destructive operations and unresolved document removal remain gated.

Read-only inspection of legacy S07/S19 and `transport-backend/src/Host/Controllers/Providers/Drivers/DriversController.cs`, `Core/Application/Providers/Drivers/{DriverDto,DriverDetailsDto,SetDriverRequest,GetDriverRequest}.cs` confirms:

- Search is `POST v1/drivers/search` with company/name/national-ID and one-based page fields; detail is `GET v1/drivers/{id}`; create/update is the same `POST v1/drivers` upsert.
- Driver ID is the persisted Person business ID. Driver detail contains licence and four document URLs, not Person identity/contact data or proof of company membership. Person detail must be fetched separately through the configured People API.
- Upsert also assigns the linked Identity Driver role. Person creation separately creates an Identity account and queues welcome messages. Neither operation is enabled merely because a row or menu is visible.
- Licence values 1/2 are source-backed codes, not approved descriptive classifications. Preview URLs are read values; writes use optional structured base64 file objects.
- Omitted images preserve current documents. Removal is not exposed: backend file deletion and `newImage ?? oldImage` database fallback disagree. Delete is not exposed: retention/target-binding/short-ID concerns remain unresolved.
- Panel enables list search for Admin/Manager and Operators when the route company matches; Operators must also match their authenticated company claim. Driver detail and Person-backed create/edit are enabled only for Admin/Manager because backend Operator entity ownership checks are missing. Person API access is scoped to the same route company and management roles.

No production API calls, document approval, operational readiness or live-backend acceptance are claimed.

## Verification Evidence

2026-11-12 controlled verification:

- Driver data-access: 40 tests passed, with lint and typecheck. Covers strict DTOs, identity matching, company/session cancellation and stale-result rejection, duplicate-save prevention, document keep/replace/reject-remove behavior, bounded payloads, null-response uncertainty and independently configured People/Drivers API URLs.
- Feature/shared UI: `panel-drivers:test` 18 passed, `shared-ui-forms:test` 55 passed, and `transport-company-feature:test` 9 passed; lint/typecheck passed for all three. The panel has 17 tests.
- Chrome production E2E: three driver tests pass. They verify initial and filtered list requests, Admin onboarding/detail/edit routes, localized Person/document copy, Operator list-only scoping, responsive RTL/LTR widths, logout behavior and the detail breadcrumb href `/client/2/drivers`.
- Production panel build passed at 497.64 kB initial JavaScript, below the existing 500 kB budget. The local build reports the authentication BFF disabled until server-side configuration is provided. jsdom logs unsupported modern CSS `@layer` parse diagnostics while unit tests pass.

- Baseline feature design evaluation (before the latest detail-page redesign): PASS using an isolated, explicitly authorized consumer of the real public route factory and application styles. Its screenshots/evidence are under `C:/Users/mrg/AppData/Local/Temp/kilo/driver-eval-*`; this was controlled-fixture evidence, not live API acceptance.

- Follow-up list implementation: exported reusable `AutocompleteSearch<T>` from `@org/ui-forms`, composed on Spartan HlmAutocomplete with keyboard navigation, clear, pending/loading/no-result states, bilingual labels and debounced server search. Driver and existing-Person searches use it; selecting a driver filters by National ID.
- Driver-specific `DriverTable` composes the existing shared TanStack `DataTable` with reusable columns, server paging and per-row View/Edit actions (both management-role-gated). Company Operators receive a read-only list without detail links. Destructive row actions remain omitted because backend retention/ownership concerns are unresolved.
- List/UI verification: Chrome production browser tests cover search URL/payload, Operator list-only scope, logout protection and responsive RTL/LTR layout. Admin/Manager add/detail/edit are separately enabled and covered below.

2026-11-12 initial-load and management correction: the SignalStore effect already dispatched its first page search, but app composition supplied `access: () => () => of(false)`, so `DriversApi.run` denied it before issuing HTTP. Company-scoped search is now available to Admin/Manager/Operator sessions under claim-matched context. Admin/Manager detail/editor access is enabled with separately scoped People API access. Controlled Chrome tests verify exact initial search payload, returned rows, filtered search, Admin detail/edit/onboarding routes, and Operator list-only access without detail requests. Successful create-and-detail and edit-retry-after-failed-save roundtrips are covered in `panel-drivers:test` (18 tests); `panel:test` has 17. Lint/typecheck and production panel build passed. Browser tests use fixtures; no live API was called. Operators remain unable to open/edit records until backend per-entity company checks are implemented. Document removal and driver deletion remain unavailable. Local build reports the authentication BFF disabled until configured and an unrelated shared-layout stylesheet warning.

2026-11-12 Spartan/i18n/detail-page refinement: Spartan Attachment renders current and replacement files/previews; driver and Person search use Spartan Autocomplete. Selected Persian/English language is passed through driver and company feature configuration; driver labels, validation, upload policy/status, denials and system messages have bilingual copy. Detail/edit child routes clear inherited breadcrumb data; Chrome verifies the Drivers crumb links to the company list. The detail page now uses Spartan cards and vertically oriented, bounded Attachment previews. The app-layout sidebar width now references a separate inherited theme token rather than a self-referential `--sidebar-width`, reserving space for navigation in the main flex layout. Full-page RTL/LTR Playwright snapshots and geometry checks are in `apps/panel-e2e/src/driver-detail.spec.ts`; fixture tests pass and no live API was called.

2026-11-13 route ownership update: `apps/panel/src/app/driver/driver.routes.ts` now adapts panel-specific company/session/permission/language state into the reusable library route factory. `apps/panel/src/app/driver/driver.page.ts` is only a router host; list/detail/editor UI remains in `libs/panel/drivers`.

2026-11-13 detail-page redesign: the page header now elevates the driver's name and identity summary; Spartan cards separate personal and driver information, while attachment previews remain bounded and readable at mobile sizes. The shared layout width-token fix reserves sidebar space and the Playwright suite asserts heading/header separation, sidebar inset, attachment dimensions, no overflow at 320/375/768/1440px, Persian/English switching, and detail breadcrumb routing. `shared-layout:test` passes (4 tests); production `panel:build` passes at 497.76 kB initial JavaScript; all 3 relevant Chrome E2E tests pass. The local auth API returned 403 and the BFF is disabled, so authentication and data were fixture-backed. Final independent design evaluation still rates visual originality below threshold; the required maximum three review rounds have been used. Destructive Delete remains unavailable due backend authorization scope concerns.
