# Legacy Panel Feature Migration Plan

## Active Task Tracking

Use [the main migration TODO](docs/migration/TODO.md) and its linked per-feature
files as the active execution backlog. This document preserves the original
plan, earlier task identifiers, and delivery history; do not maintain a second
competing progress ledger here. Read `docs/BUSINESS_DOMAIN.md` and
`apps/panel/ARCHITECTURE.md` before implementing any linked task.

Source: `../panel` (Angular 15 transport administration).
Target: `apps/panel` (Angular 22, Nx 24, zoneless).
Status: reusable foundation implementation started. Updated Press ID theme
customization is tracked in `CORE-THEME-TASKS.md` following the explicit request
to resume it. Future applications must be able to consume
the same features, layouts, components, guards, functions, and utilities.

## Tracking Rules

Each task starts with `[ ]` and becomes `[X]` only after its stated work and
verification are complete. Source-wired legacy behavior is not proof of a working
backend integration or a completed feature in the new app. Complete each vertical
slice before moving on; update the active feature file and its main-index task
during implementation.

## Completed Preparation

[X] P01 Read workspace `.agents` Angular developer, Spartan, Nx workspace, and Nx generation skills.
[X] P02 Inspect the legacy router, navigation, role handling, forms, tables, maps, and workflows.
[X] P03 Inventory legacy API services, DTOs, session handling, caches, and realtime integrations.
[X] P04 Inspect the target app's actual Nx targets, current login/core, and reusable Spartan sources.
[X] P05 Verify the table dependency: manifest requests v9; installed `@tanstack/angular-table` is 9.3.1.
[X] P06 Define architecture, migration order, reuse rules, API risks, and acceptance criteria in this plan.

## Scope and Feature Evidence

| Area                          | Legacy evidence                                                           | Migration classification                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Login/logout                  | `../panel/src/app/auth/data-access/services/auth.service.ts`              | Port behavior with a rebuilt session boundary; no SSO.                                                                             |
| Password recovery             | `../panel/src/app/auth/feature/forget-password/`                          | Email flow is routed; token/error handling needs contract verification. Phone/OTP alternatives are not an established active flow. |
| Companies                     | `../panel/src/app/pages/company/`                                         | List/search/create/edit/delete, company selection, geography, logo, coordinates. Coordinate picker is broken.                      |
| Users                         | `../panel/src/app/pages/users/`                                           | Company-scoped CRUD, person search, identity/contact/address/photo. Birthday is rendered but unbound.                              |
| Drivers                       | `../panel/src/app/pages/drivers/`                                         | Two-step person/driver onboarding and editing, licence level, identity/licence documents.                                          |
| Vehicles                      | `../panel/src/app/pages/car/`                                             | CRUD, driver/type selection, plate, capacity, production year, photos/documents, inline type creation.                             |
| Scheduling                    | `../panel/src/app/pages/shift-time/`, `shift/`                            | Departure times, shift groups, shifts, rotation and holiday flags; edit initialization needs repair.                               |
| Directions/prices             | `../panel/src/app/pages/direction/`                                       | CRUD and effective-dated fare/absence penalties; fare edit patch is incomplete.                                                    |
| Lines/stations                | `../panel/src/app/pages/line/`, `station/`                                | Direction-scoped CRUD, station order, coordinate fields; paging and map behavior need repair.                                      |
| Driver-line assignments       | `../panel/src/app/pages/driver-line/`                                     | Driver/direction/line selection, effective start/end dates, CRUD.                                                                  |
| Passenger bulk assignment     | `../panel/src/app/pages/passenger/`                                       | Select existing people and assign shift/station/optional line. This is not person creation.                                        |
| Station-passenger assignments | `../panel/src/app/pages/station-passenger/`                               | Routed list/create/edit/delete, but hardcoded scope and incomplete edit patches must be fixed.                                     |
| Support requests              | `../panel/src/app/pages/requests/`                                        | Hidden-but-routed list/details/delete; detail navigation is broken. No implemented approval/respond workflow.                      |
| Realtime                      | `../panel/src/app/shared/data-access/services/signal-r.service.ts`        | Support/location event wiring exists; lifecycle, payload normalization, and company isolation need rebuilding.                     |
| Dashboard/maps                | `../panel/src/app/map/`, `pages/dashboard/`, `shared/components/leaflet/` | Active dashboard is a hardcoded Mapbox demo; direction map and coordinate picking are incomplete.                                  |
| Reports/analytics             | Commented dashboard summaries and static route grids                      | Not established functional legacy features; do not invent live statistics or claim parity.                                         |

## Architecture

### Reusable Libraries and Thin Applications

```text
apps/panel/src/app/           # composition/configuration only
  app.config.ts              # supply URLs, tenant, branding, feature providers
  app.routes.ts              # mount shared route factories under app-owned paths
  app.routes.server.ts       # public SSR / protected CSR policy
  core/preferences/          # current app preference adapter; theme work paused

libs/shared/
  auth/data-access/          # config, backend adapter, session store, interceptor,
                            # guards, JWT/error/redirect functions
  auth/feature/              # configurable login UI and reusable route factory
  layout/                   # projected authentication/application layouts
  ui/forms/                 # reusable Signal Forms/Spartan input bridge
  ui/                       # future proven table/upload compositions
  util/                     # pure validation/date/ID/coordinate helpers
  http/                     # common envelope/pagination/error transport when reused

libs/transport/              # reusable business features, never generic auth deps
  company/                  # route-aware context and company workflows
  administration/           # user/driver/vehicle workflows
  scheduling/               # shift/time/group workflows
  network/                  # directions/prices/lines/stations/maps
  assignments/              # driver-line and passenger assignments
  requests/                 # support workflow
  realtime/                 # transport-specific typed event adapters

libs/spartan/                # existing owned Helm source; reuse first
```

Use non-buildable Nx libraries with public import aliases for internal reuse;
publishable packaging can be added when cross-repository distribution is needed.
Do not create empty placeholder libraries: generate each boundary as its first
implementation arrives. Applications compose providers and routes; shared
libraries must never import from `apps/*`, a particular app's PreferencesStore,
transport-company state, hardcoded branding, or app-specific navigation.

Dependency direction is `apps -> domain features -> data-access/shared -> utils`.
Generic auth/layout/UI cannot depend on transport features. Separate generic
mechanisms from backend-specific contracts using injected configuration/adapters.
Expose typed provider functions, signal inputs/outputs, content projection,
route/guard factories, and pure utilities instead of duplicating code per app.
Use Nx tags and lint constraints to enforce project-level boundaries.

Cross-feature lookups use narrow read APIs and types, not another feature's
mutable store. Preserve the existing shop/API examples and paused theme work.

### Implementation Rules

1. Use Bun exclusively for installs, generators, formatting, and Nx tasks. Keep
   `bun.lock`; align `packageManager` and CI before new dependency work.
2. Use standalone OnPush components, `inject()`, signal inputs/outputs, native
   control flow, `computed()` for derived state, and the existing zoneless setup.
3. Use Angular Signal Forms for all new forms. Keep form drafts local and separate
   from loaded entities and authentication state. Follow local skill rules on
   non-null form defaults; map empty selections to nullable/omitted wire values
   explicitly instead of sending a sentinel ID to the backend.
4. Use feature/page-scoped NgRx Signal Stores from reusable libraries for data and workflow state. Reserve
   root stores for session/company context and genuinely application-wide state.
   Do not retain the old root reducers/effects/facades for every feature.
5. Use installed TanStack Table v9 APIs, verified from installed types, with
   Spartan table/pagination/menu/checkbox primitives. Do not copy v8 tutorials or
   legacy NG-ZORRO grids. SignalStore owns fetched data; do not add a second query
   cache without a concrete need.
6. URL query parameters own shareable pagination/filter state. Adapt zero-based
   table pages to the backend's confirmed page convention. Use server filtering,
   sorting, and pagination only where the endpoint supports them; array endpoints
   may use local table operations. Never treat one server page as the whole data set.
7. Include session, company, parent IDs, filters, page/size, and effective dates
   where applicable in request identity. Cancel superseded reads and reject stale
   completions. Reset row selection and data when company/session changes, even
   when Angular reuses the same parameterized route.
8. Prevent duplicate saves, preserve drafts on failure, map server field errors,
   and invalidate/refetch the affected scoped lists after mutation. Do not copy
   old `resetForm` flags or cache checks based only on `Loaded`.
9. Reuse existing Helm components before generating anything. Use Spartan `field`,
   field errors, dialogs, confirmations, skeletons, empty states, and toasts. Keep
   domain forms explicit; do not build a universal metadata-driven CRUD engine.
10. Preserve RTL/LTR support and the current tokens without doing new theme work.
    Use logical layout properties, keyboard-accessible controls, and LTR islands
    for technical identifiers where appropriate.

## API and Security Boundaries

The source router is `../panel/src/app/shell/shell.routes.ts`. The old HTTP wrapper
is `../panel/src/app/shared/data-access/services/api.service.ts`. These describe
behavior to verify, not infrastructure to copy unchanged.

| Contract                             | Required treatment                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envelope `{ result, code, massage }` | Normalize at the API boundary; preserve the wire spelling. Handle both envelope and exception/validation error formats. Confirm application success codes.              |
| Login `/tokens/get-by-email/`        | Send `{ email: username, password }`, not an invented username field. Parse an explicit token response DTO and normalize claims/roles.                                  |
| Refresh `/tokens/refresh`            | Existing contract requires `{ token, refreshToken }`; coordinate one in-flight refresh per session and retry once. Never let late refresh restore a logged-out session. |
| Logout `/personal/logout`            | Clear local session/company/feature state and stop realtime even if remote logout fails; confirm server revocation semantics.                                           |
| `/v1/companys/...`                   | Preserve actual endpoint spelling. Frontend domain names may use `companies`.                                                                                           |
| Searches                             | Many legacy endpoints use POST bodies, not GET query parameters. Preserve supported filters and page fields instead of copying fixed first-page bugs.                   |
| Shift-group detail                   | Backend has `GET /v1/shifts/shift-group/{id}`; do not copy the old POST-list call used as detail.                                                                       |
| Images                               | Separate read URLs from write `{ name, extension, data, deleteCurrentImage? }` payloads. Confirm data-URL and removal behavior.                                         |
| Coordinates                          | Map flat read `lat`/`lng` and nested write `coordinate` explicitly. Zero latitude/longitude is valid.                                                                   |
| Dates/times/prices                   | Keep date-only, time-only, instants, calendar display and currency units distinct. Verify effective-date rules before assignment/pricing completion.                    |
| Location events                      | Normalize backend flat `Lat`/`Lng` and nullable identifiers; legacy nested `Coordinate` assumptions are wrong.                                                          |

Bearer credentials must only go to the configured API origin and approved path
prefix. Anonymous auth requests and external map/routing origins must not receive
them. Do not copy browser `Access-Control-*` request headers, source-embedded keys,
or the production URL as the development default. No live production writes are
part of discovery or tests.

Initial protected routes should use client rendering; public login can retain SSR
and hydration. Exclude auth/private responses from transfer caching. There is no
SSR-readable backend session merely because hydration is enabled. A persistent
HttpOnly/BFF session requires real backend work and is not silently assumed.
Pending the persistence decision below, the safe initial client session is
in-memory, with re-login after a full reload; do not automatically copy `TRA-auth`.
Frontend guards/menu permissions improve navigation but never replace backend
authorization or company isolation.

## Migration Checklist

### Reuse Contract for Every Feature

[X] U01 Implement configurable shared authentication providers/backend adapter and SignalStore without application imports or hardcoded production URLs.
[X] U02 Implement reusable login routes, authenticated/guest guards, safe-return URL utilities, credential interception, and role guard factories.
[X] U03 Extract reusable Spartan/Signal Forms login UI and projected authentication layout; supply branding, locale, appearance actions and success destinations from each app.
[X] U03a Keep SSR login controls disabled until hydration owns Signal Forms state; verify delayed JavaScript and disabled/re-enabled validation transitions.
[X] U04 Integrate `apps/panel` as a thin consumer of shared auth; verify alternate consumer configuration and route mounting in tests.
[ ] U05 Provide reusable application navigation/layout primitives with projected actions and app-owned navigation/permission configuration when the protected shell is delivered.
[X] U05a Deliver auth-independent projected AuthLayout/AppLayout primitives and test slot projection.
[ ] U06 Deliver shared field validation, TanStack/Spartan tables, lookups, uploads, date/coordinate controls, and pure utilities in libraries rather than app-local copies as each is required.
[X] U06a Deliver and test the reusable Spartan SignalInput bridge in `@org/ui-forms`, independent of authentication and application providers.
[ ] U07 Deliver each transport domain as reusable route/feature/data-access boundaries with configurable mount paths and scoped stores, not pages coupled to the panel application.
[X] U08 Establish dependency-boundary, public API, alternate-configuration, and consumer integration checks for the four delivered libraries; require the same checks for future libraries.

All feature tasks below inherit this reuse contract. A workflow is not complete
if its implementation still depends on a concrete application. Keep forms and
business rules explicit; reuse does not mean a speculative universal CRUD engine.

### First Reusable Delivery

Implemented packages (validation is recorded below when complete):

- `@org/auth-data-access`: injected configuration/backend contract, in-memory
  SessionStore, login/refresh/logout, guards, role checks, and safe URL helpers.
- `@org/auth-feature`: presentational Signal Forms login, smart login page,
  configurable branding/appearance adapter, and reusable login route factory.
- `@org/layout`: projected authentication and protected application layouts with
  no authentication or application-state dependencies.
- `@org/ui-forms`: auth-independent Spartan input/Signal Forms integration with
  interaction-gated error semantics, tested in a non-auth record form.

`apps/panel` supplies providers, route composition, branding, and its current
preference adapter. It does not contain a duplicate login implementation.
The temporary `/workspace` route proves authenticated layout/logout integration;
it does not claim company selection or any transport workflow is implemented.
Import embedded `LoginForm`/`LoginPage` components from `@org/auth-feature/ui`;
the main entry intentionally exports only route/provider runtime code so that
calling `createAuthRoutes` preserves the lazy login boundary.

The initial session is intentionally in-memory. Reloading requires login again;
there is no token storage, SSO, or assumed backend/BFF cookie support. API calls
use `/api`; the development proxy targets only `https://localhost:5001` from the
backend development launch configuration. Production must route `/api` to the
backend before this Node server, or supply an explicit API URL in `panel.config.ts`.
Unproxied API requests return JSON 503 rather than Angular login HTML. There is
no production endpoint fallback and no source-embedded credentials.

### Consumption by Another Nx Application

Applications own paths and identity; the same implementation can be mounted
under a different login path without importing anything from `apps/panel`:

```typescript
import { provideRouter } from '@angular/router'
import { authGuard, provideAuth } from '@org/auth-data-access'
import { createAuthRoutes, provideAuthFeature } from '@org/auth-feature'

const providers = [
  provideAuth({
    apiUrl: '/api',
    tenant: 'root',
    loginUrl: '/sign-in',
    afterLoginUrl: '/account',
  }),
  provideAuthFeature({ brandName: 'Another application' }),
  provideRouter([
    ...createAuthRoutes({ path: 'sign-in', title: 'Sign in' }),
    {
      path: 'account',
      canActivate: [authGuard],
      loadComponent: () => import('./account.page').then(m => m.AccountPage),
    },
  ]),
]
```

Pass this provider array to that application's configuration alongside its own
zoneless/hydration infrastructure. The application must scan the shared sources
and consumed Helm directories with Tailwind and supply shared design tokens.
No theme customization work is included in this delivery.

`provideAuth` owns a scoped HttpClient and auth interceptor alongside its session
store, so independently configured consumers do not inherit another consumer's
credentials. Do not register the auth interceptor a second time. In HTTP unit
tests, register `provideHttpClientTesting()` after `provideAuth(...)`. Role denial
returns `false` rather than redirecting to an application destination that might
have the same restriction; each app can compose its own forbidden-page behavior.

An alternative backend can provide `AuthBackend` after `provideAuth(...)` with
the library's typed `login`, `refresh`, and `logout` methods. Optional
`AUTH_APPEARANCE` callbacks connect an app's existing direction/theme controls;
without callbacks the login remains usable and those controls are not shown.
Use layout projection slots rather than importing app shells into shared code.

### Phase 1: Contracts, Session, and First End-to-End Slice

[X] F01 Align the workspace package-manager declaration, scripts, lockfile policy, and CI commands with Bun.
[X] F02 Establish a new-app test/lint/production-build baseline using Bun-prefixed Nx tasks.
[ ] F03 Add validated API/hub/tenant configuration with an explicitly safe development endpoint and no production fallback.
[X] F03a Deliver validated authentication API/tenant configuration and local-only development proxy; hub configuration remains deferred to realtime.
[X] F04 Confirm source-level token DTOs, refresh/expiry/logout contracts, tenant requirements, and allowed backend origins; live backend acceptance remains a release gate.
[X] F05 Document the initial in-memory-only session and absence of backend/BFF cookie changes; persistent reload sessions remain a separate future decision.
[ ] F06 Implement typed envelope, error, pagination, identity/role, and read/write DTO adapters with contract tests.
[X] F06a Deliver typed auth envelope/token/identity/role/error adapters with contract tests; generic record/pagination/image adapters remain pending.
[X] F07 Implement SessionStore, real username/password login, safe return URLs, functional guards, and logout without SSO.
[X] F08 Implement API-origin-scoped credentials and single-flight refresh with terminal error handling and stale-session protection.
[ ] F09 Define and test the actual role/action/company-access matrix against backend enforcement; do not infer it from menu visibility.
[ ] F10 Implement reusable protected shell, responsive navigation, breadcrumbs, account/logout actions, and truthful loading/error states.
[ ] F11 Implement route-authoritative company context and company search/selection with invalid-ID/access handling and stale-response tests.
[ ] F12 Deliver the first real TanStack v9/Spartan company-search table and extract reusable table/paging pieces from that working slice.
[ ] F13 Verify login -> company selection -> authorized `/client/:companyId` workspace -> logout in a browser.
[ ] F14 Implement and verify email password recovery/reset after confirming the reset-token response contract; leave dormant phone/OTP variants out unless approved.

### Phase 2: Reusable Controls and Core Records

[X] R01 Verify consumed Helm source/export/API availability before adding or regenerating authentication controls; repeat this check for future controls because CLI inventory can miss existing local files.
[ ] R02 Extract a typed reusable TanStack/Spartan table composition with column templates, stable row IDs, row actions, loading/empty/error states, paging, and explicit row selection.
[ ] R03 Add reusable delete confirmation, page/action layout, and server-validation feedback compositions only where existing Helm pieces do not already cover them.
[ ] R04 Implement shared province/city lookups with dependent-selection reset, parameter-aware caching, and accessible async company/person/driver searches.
[ ] R05 Implement reusable image/document input with preview, replacement, deletion, MIME/size validation, explicit DTO mapping, and request cancellation/lifecycle cleanup.
[ ] R06 Implement date-only/Jalali presentation and time inputs using compatible existing primitives first; test calendar conversion and avoid UTC date-only shifts.
[ ] R07 Implement reusable validated coordinate entry; assess map-provider support and add map picking when the provider/key decision is settled, without blocking numeric coordinate entry.
[ ] R08 Extract pure, tested Iranian phone/mobile, optional email, numeric, ID, date, and image-mapping utilities where reused.
[ ] C01 Implement company list/search, create, edit, delete, type, location/contact fields, logo, and working coordinate entry.
[ ] C02 Implement company-scoped user list/search, create, edit, delete, identity/contact/address, and profile image; resolve whether birthday is required before adding it.
[ ] C03 Implement driver list/search/delete and the two-step existing/new person plus driver-document create/edit workflow.
[ ] C04 Verify licence levels, normalized driver IDs, document changes, and step prerequisites without copying `LocalId`/`localId` defects.
[ ] C05 Implement vehicle list/create/edit/delete with driver lookup, plate/color/year/capacity, vehicle type/model, documents, and inline type creation.
[ ] C06 Verify company switches, deep links, reloads, server field errors, empty lists, image deletion, and list refresh for all core records.

### Phase 3: Scheduling

[ ] S01 Implement departure-time list/create/edit/delete with correct company scope and time serialization.
[ ] S02 Implement shift-group creation/editing needed by shifts, types, start date, rotation cycle, and holiday flags; confirm detail/update contracts.
[ ] S03 Implement shift list/create/edit/delete with group, outbound/return times, `offShift`, rotation, and order fields.
[ ] S04 Test full edit round trips for `offShift` and rotation fields omitted by the legacy form; do not claim dormant shift drag-ordering as parity.

### Phase 4: Transport Network and Pricing

[ ] N01 Implement direction list/create/edit/delete and departure time with parent company scope.
[ ] N02 Implement effective-dated fare and absence-penalty editing as an explicit workflow, including correct existing-price initialization and validated units/ranges.
[ ] N03 Implement nested line list/create/edit/delete, direction lookup, outbound/return times, and correct scoped pagination/filter transport.
[ ] N04 Implement nested station list/create/edit/delete with province/city/address/coordinates and stable direction scope.
[ ] N05 Implement station position/order editing and verify server persistence; do not assume a batch reorder endpoint exists.
[ ] N06 Implement the approved browser-only map adapter and working coordinate pick/confirm/cancel/reset behavior with lifecycle cleanup and no embedded credentials.
[ ] N07 Implement direction/station map visualization from real scoped data; remove the legacy routing-control reference bug rather than copying it.
[ ] N08 Verify nested direct links, missing/deleted parents, ordering, map coordinate conventions, and pricing date boundaries.

### Phase 5: Assignments and Passenger Operations

[ ] A01 Implement driver-line list/filter/create/edit/delete with dependent direction/line/driver lookup and effective start/end dates.
[ ] A02 Implement assigned and unassigned passenger searches as distinct modes, including an explicit decision for partially assigned people.
[ ] A03 Implement reusable table selection semantics for bulk assignment, including page changes, select-all meaning, company changes, and disabled/ineligible rows.
[ ] A04 Implement bulk assignment of existing passenger IDs to shift/station/optional line/effective date with validated prerequisites and dependent lookup resets.
[ ] A05 Implement station-passenger list/create/edit/delete using actual route/selected scope, never hardcoded station 1.
[ ] A06 Verify complete assignment edit initialization, IDs, date/overlap rules, duplicate submission protection, error recovery, and post-mutation invalidation.

### Phase 6: Requests and Realtime

[ ] O01 Implement the source-backed support-request list/details/delete workflow and correct request-detail navigation; do not invent approve/respond/status actions.
[ ] O02 Decide the intended navigation visibility of requests and replace inert notification actions with an explicit supported destination.
[ ] O03 Implement typed SignalR events with authenticated startup, reconnect, idempotent registration, teardown, stop-on-logout, and company-aware lifecycle.
[ ] O04 Implement deduplicated, company-scoped support notifications without corrupting filtered list contents or page counts.
[ ] O05 Normalize and test driver-location events, nullable IDs, stale/out-of-order updates, and scoped map updates where live monitoring is required.
[ ] O06 Replace the demo dashboard landing with source-backed navigation/status only; any real analytics, financial audits, replacement vehicles, or reports require separately defined API-backed scope.

### Phase 7: Parity and Release

[ ] V01 Verify old-to-new route coverage, including `/auth/login`, `/companys`, `/client/:companyId/...`, nested station passengers, and direct request URLs; preserve or redirect established deep links deliberately.
[ ] V02 Verify role/action restrictions and cross-company isolation through direct URLs and entity-ID endpoints, not just sidebar visibility.
[ ] V03 Test concurrent refresh, corrupt/expired session inputs, logout races, stale responses, context changes, and private-data cleanup.
[ ] V04 Test DTO/wire spelling, image deletion, date-only/time values, numeric/string IDs, money units, bulk assignment, and pagination totals.
[ ] V05 Verify all new forms/tables/dialogs and error/empty/loading states under zoneless rendering, RTL/LTR, mobile, keyboard navigation, and screen-reader semantics.
[ ] V06 Verify browser-only maps/realtime, public SSR hydration, protected client rendering, credential isolation, and deployment host/API configuration.
[ ] V07 Run Bun/Nx tests, lint, type checks where configured, production builds, and browser parity suites for each delivered slice.
[ ] V08 Record staging acceptance evidence and any backend-dependent gaps; mark only implemented and verified tasks `[X]`.

## Decisions and Contract Gates

These are not reasons to stop safe preparation. Resolve each before implementing
the affected behavior; do not turn assumptions into undocumented defaults.

| Decision                                                                                   | Needed before                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Safe development/staging backend and tenant configuration                                  | First live API request; never use old production credentials or test data for writes. |
| In-memory versus persistent session, refresh rotation, logout/revocation, cookie/BFF scope | Session persistence and authenticated SSR.                                            |
| Role capabilities, company membership/access source, backend policies                      | Authorized company switching and protected mutations.                                 |
| Password recovery token/content type and delivery mechanism                                | Recovery/reset completion.                                                            |
| Server page convention, sorting/filter support, totals, cross-page selection               | Table/API integration and bulk passenger operations.                                  |
| Map provider, browser-key restrictions/proxy, licensing, routing API                       | Map/routing delivery; coordinate numeric input can precede it.                        |
| Date calendar/timezone, inclusive effective dates, overlap rules, currency units           | Pricing, scheduling and assignments.                                                  |
| Image deletion behavior, upsert versus PUT contracts, shift-group endpoints                | The affected record's save/delete acceptance.                                         |
| Requests visibility and real dashboard/report/live-monitoring scope                        | Operational navigation and any features beyond proven legacy behavior.                |

## Verification Strategy

### First Delivery Results

- All 142 unit/integration tests pass: 90 auth data-access, 35 auth feature,
  12 panel consumer/preferences, 3 reusable form input, and 2 layout projection.
- All 16 applicable test/lint/typecheck targets pass for the four libraries,
  panel, and browser-test configuration.
- All 7 Chrome end-to-end tests pass against production SSR with controlled API
  fixtures, including localized failures, return URLs, login/logout, private CSR,
  API JSON failures, host validation, and mobile RTL/LTR behavior.
  The production-policy test intentionally skips the development server; set
  `BASE_URL` to a production SSR preview to include that seventh check. The
  development workflow passes 6 tests with only that production-policy test
  skipped. A delayed-JavaScript test verifies credentials cannot be lost before
  hydration enables the controls.
- Production browser/server and consumed Helm builds pass. The initial browser
  payload is approximately 353 kB, below the existing 500 kB warning budget; login
  UI remains a real lazy chunk through the separate `/ui` public entry.
- Independent verification confirms scoped HTTP/token/tenant isolation,
  unrelated HTTP passthrough with unconfigured auth, and terminating role denial.
- Final desktop/mobile visual checks pass, including localized 401 feedback,
  runtime language switching without another request, neutral validation after
  hydration, and the 44px brand target with its unchanged 40px mark.
- Live backend/staging acceptance is not claimed. No production calls or writes
  were performed; token persistence, company selection, table/business workflows,
  password recovery, and realtime remain unchecked tasks above.
- Existing jsdom CSS-parser warnings for Ng Icons' `@layer` stylesheet are
  non-failing; real styling is checked separately in Chrome. Firefox/WebKit and
  physical-device/screen-reader audits remain release work.

Use HTTP testing/fixtures for contracts, not live production calls. Test pure
adapters independently, SignalStores against cancellation/race scenarios, Signal
Forms with zoneless TestBed, tables against real v9 APIs, and navigation with
RouterTestingHarness. Add browser tests for each end-to-end workflow, including
failures and access denial. Do not mark a list complete when its create/edit/delete
flow or server integration is still a mock.

Representative commands, run from `front`:

```powershell
bun install --frozen-lockfile
bun nx show project panel --json
bun nx g @spartan-ng/cli:info --json --no-interactive
bun nx run panel:test
bun nx run panel:lint
bun nx run panel:build
bun nx run panel-e2e:typecheck
bun nx run panel-e2e:lint
bun nx run panel-e2e:e2e --args="--project=chromium --headed"
```

Check generator help/source and dry-run before actual scaffolding. Read installed
TanStack declarations instead of assuming an older adapter API. Add tests for
every newly extracted reusable component and its Signal Forms integration.

## Critical Target Files

- `package.json`, `bun.lock`, relevant CI workflows: Bun/tooling alignment.
- `apps/panel/src/app/app.config.ts`: infrastructure providers/interceptors.
- `apps/panel/src/app/app.routes.ts`: public/protected/lazy domain routes.
- `apps/panel/src/app/app.routes.server.ts`: public SSR versus protected CSR.
- `libs/shared/auth/feature/src/lib/login.page.*`: reusable login orchestration.
- `libs/shared/auth/feature/src/lib/login-form.*`: presentational Signal Form.
- `libs/shared/auth/data-access/src/lib/*`: configurable session, guards, API boundary, and pure auth helpers.
- `libs/shared/layout/src/lib/*` and `libs/shared/ui/forms/src/lib/*`: projected layouts and reusable form primitives.
- `apps/panel/src/app/panel.config.ts`, `apps/panel/proxy.conf.json`: app-owned endpoints, paths, branding, and development transport.
- Proposed `libs/shared/*` and `libs/transport/*` paths above: reusable staged delivery.
- `eslint.config.mjs`: app-folder dependency rules where needed.
- Existing `libs/spartan/*`: reuse and repair integration metadata only as needed.
- `apps/panel-e2e/`: expand workflow acceptance tests.
- `apps/panel/src/styles.css`: register source paths for consumed Helm controls only
  when required for feature rendering; do not redesign themes.

The separate `CORE-THEME-TASKS.md` records the earlier foundation work. This plan
tracks business migration; completed foundation work does not mean any legacy
business feature is already migrated.
