# Panel Architecture and Feature Delivery

This is the implementation contract for `apps/panel` and future Angular apps in
this Nx workspace. Run the commands below from the `front` workspace root.

## Contents

- [Principles](#principles)
- [Current Structure](#current-structure)
- [Dependency Rules](#dependency-rules)
- [State, Forms, and Tables](#state-forms-and-tables)
- [Authentication and Theme](#authentication-and-theme)
- [Feature Delivery Workflow](#feature-delivery-workflow)
- [Adding Another App](#adding-another-app)
- [Verification and Completion](#verification-and-completion)

## Principles

- Keep applications thin: bootstrap, deployment configuration, provider adapters,
  route mounting, and app-specific branding belong in `apps/*`.
- Implement reusable capabilities in Nx libraries. Shared libraries must not
  import an app, its preferences store, its environment, or its concrete routes.
- Give each app feature a thin entry folder at
  `apps/panel/src/app/<feature>/` containing its route factory adapter and, when
  needed, an app-owned `<router-outlet>` host. The central `app.routes.ts` should
  lazy-load that entry rather than accumulating feature permissions/configuration.
- Implement actual feature page/component content and reusable forms inside an
  appropriate Nx library (for example `libs/panel/drivers`). App-local page files
  may only host the library router outlet; do not copy feature UI or domain state
  into `apps/panel`.
- Keep shared domain state in transport libraries and preserve public library APIs
  when extending earlier migration work.
- Separate generic capabilities from transport business rules. Authentication,
  layouts, form primitives, and theme are generic; company and assignment rules
  belong to reusable transport-domain libraries.
- Use standalone OnPush components, `inject()`, signals, computed state,
  signal inputs/outputs, and native Angular control flow. Keep the app zoneless.
- Use Angular Signal Forms for feature forms, NgRx Signal Store for workflow
  state, TanStack Table v9 for tables, and Spartan Helm/Brain for UI primitives.
- Use Bun for dependencies, generators, formatting, and Nx execution. Keep
  `bun.lock` consistent; do not introduce another lockfile or package manager.
- Reuse an existing implementation first. Extract useful repeated behavior, not
  a speculative universal CRUD framework or an empty collection of libraries.

## Current Structure

| Location / Public Entry                      | Responsibility                                                                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/panel/src/app/app.config.ts`           | Compose providers, hydration, routing, auth/theme adapters, and directionality.                                                                                               |
| `apps/panel/src/app/panel.config.ts`         | App-owned API prefix, tenant, branding, and login/success paths.                                                                                                              |
| `apps/panel/src/app/app.routes.ts`           | Mount reusable auth routes, protect the workspace, and lazily load app-local feature entries.                                                                                 |
| `apps/panel/src/app/driver/`                 | Panel-owned driver route/provider adapter and thin RouterOutlet page host; it consumes the reusable library, not embedded page markup.                                        |
| `apps/panel/src/app/driver/driver.routes.ts` | Adapt panel session, company, permission, and language signals into the reusable `@org/panel-drivers` route factory.                                                          |
| `apps/panel/src/app/driver/driver.page.ts`   | Thin app-owned RouterOutlet host; driver list/detail/editor UI remains in `libs/panel/drivers`.                                                                               |
| `apps/panel/src/app/feature/shift/`          | Thin app-owned Shift route/access adapter and RouterOutlet host; Shift UI remains in `libs/panel/shift`.                                                                      |
| `apps/panel/src/app/vehicles/`               | Panel-owned route/access adapter and thin outlet host; Admin/Manager reads require the active company, while vehicle writes remain gated on ownership/history policy.         |
| `apps/panel/src/app/routes/routes.routes.ts` | Panel-owned Direction read/access and map-key adapter; mounts legacy `/client/:companyId/direction` through the lazy library route factory.                                   |
| `apps/panel/src/app/routes/line.routes.ts`   | Adapter for nested Line Route context, company/role policy, and server-backed Departure Time lookup configuration.                                                            |
| `apps/panel/src/app/app.routes.server.ts`    | Render routes per request with validated, request-scoped authentication.                                                                                                      |
| `apps/panel/src/app/core/preferences/`       | Panel's direction/language adapter; not a second theme store.                                                                                                                 |
| `@org/auth-data-access`                      | Configurable backend contract, public session metadata, HTTP interception, guards, and auth helpers.                                                                          |
| `@org/auth-data-access/node`                 | Node-only cookie BFF, server-held tokens, session storage contract, and SSR restoration.                                                                                      |
| `@org/auth-feature`                          | Auth presentation providers and the lazy login route factory.                                                                                                                 |
| `@org/auth-feature/ui`                       | Explicit public entry for embedding `LoginForm` or `LoginPage`.                                                                                                               |
| `@org/layout`                                | Projected `AuthLayout` and `AppLayout`, independent of auth/theme stores; optional typed navigation metadata composes the owned Spartan sidebar/menu and mobile sheet.        |
| `@org/ui-forms`                              | Reusable Signal Forms input/lookup/coordinate bridges, Spartan Autocomplete/Attachment compositions, bilingual copy models, typed file selection and accessible confirmation. |
| `@org/transport-http`                        | Opt-in transport envelope/page/error decoders and safe configured requests through the existing scoped HttpClient.                                                            |
| `@org/transport-company-data-access`         | Typed company read/write/lookup APIs, scoped search/editor stores and navigation-committed context; no inferred membership policy.                                            |
| `@org/transport-company-feature`             | Configurable lazy search/create/edit route and provider entry; media/delete/approved-policy acceptance remains open.                                                          |
| `@org/transport-company-feature/ui`          | Explicit component entry for embedding CompanyPage/CompanyEditor without eagerly loading UI from the route entry.                                                             |
| `@org/transport-shell-feature`               | Configurable lazy landing/company shell, navigation-committed context, breadcrumbs/account/navigation and explicit error states.                                              |
| `@org/transport-people-data-access`          | Explicit company/access-configured Person adapters, API and cancellable search state; live access/mutation policy remains gated.                                              |
| `@org/panel-people`                          | Lazy configurable company-scoped Person search/page and typed selection intent, with UI under `libs/panel/people/src/lib/ui`.                                                 |
| `@org/panel-people/ui`                       | Explicit embedding entry, separate from the light provider/route entry.                                                                                                       |
| `@org/transport-departure-times-data-access` | Source-backed bounded-list, TimeSpan and scoped list/detail/upsert state; deletion and live policy acceptance remain open.                                                    |
| `@org/panel-departure-times`                 | Configurable lazy bounded-list/create/edit pages, with library-owned `ui` components, explicit access and guarded local drafts.                                               |
| `@org/transport-scheduling-data-access`      | Typed company/group-scoped Shift and Shift Group adapters plus a route-scoped NgRx SignalStore; backend role authorization and full-list paging remain open.                  |
| `@org/panel-shifts`                          | Configurable lazy shift list/create/edit routes, group/type/travel-time lookups, Signal Forms, and a Shift Group creation dialog.                                             |
| `@org/panel-driver-line`                     | Configurable lazy company-scoped Driver-Line list/detail/create/edit routes, shared driver autocomplete, and Direction/Line lookups.                                          |
| `@org/panel-departure-times/ui`              | Separate entry for embedding departure-time page/editor components without eager UI in route configuration.                                                                   |
| `@org/transport-drivers-data-access`         | Configured Person-backed driver search/detail/upsert adapters and scoped SignalStore; explicit authorization, document preservation/replacement, no deletion.                 |
| `@org/panel-drivers`                         | Lazy configurable company-scoped driver list, onboarding, details and editor routes with local Signal Forms and guarded drafts.                                               |
| `@org/panel-drivers/ui`                      | Separate embedding entry for driver pages and Person form, without eager UI in route configuration.                                                                           |
| `@org/transport-vehicles-data-access`        | Source-backed company-scoped vehicle/type CRUD adapters and SignalStore; app access remains denied pending ownership, deletion/history and image-semantics decisions.         |
| `@org/transport-vehicles-feature`            | Configurable lazy vehicle list/detail/editor, Driver API autocomplete, server car-type lookup/creation and replacement-only shared uploads.                                   |
| `@org/transport-routes-data-access`          | Company-scoped Direction list/detail and Route-station search APIs plus route-scoped NgRx SignalStore; app write access remains gated.                                        |
| `@org/transport-routes-feature`              | Lazy Direction list/detail/editor/map pages, row actions, server-loaded Stations and typed reusable route configuration.                                                      |
| `@org/shared-maps`                           | Browser-only Neshan MapLibre station-marker adapter with injected Web Map key, RTL labels, fallback and teardown.                                                             |
| `@org/transport-support-data-access`         | Explicit-scope read-only search/detail/case-file adapters and independent cancellable stores; no messages, mutations or inferred applicant types.                             |
| `@org/ui-data-table`                         | Typed TanStack v9/Spartan server-page composition, stable row IDs and optional typed action intent.                                                                           |
| `@org/theme`                                 | Validated theme model, NgRx ThemeStore, palette/token generation, persistence, and safe custom CSS.                                                                           |
| `@org/theme-ui`                              | Configurable Spartan customization sheet.                                                                                                                                     |
| `libs/spartan/*`                             | Existing owned Helm source; inspect its actual exports before adding controls.                                                                                                |
| `libs/base-theme.css`                        | Shared semantic design tokens and base theme rules.                                                                                                                           |
| `apps/panel/src/styles.css`                  | Font/CSS imports and explicit Tailwind source discovery.                                                                                                                      |
| `apps/panel-e2e/`                            | Browser acceptance tests and reusable controlled API fixtures.                                                                                                                |

Direction and Line UIs are implemented in `@org/transport-routes-feature` and
`@org/transport-lines-feature`, backed by their matching data-access libraries.
The Line route factory is injected beneath the Route detail path so its API/store
scope carries the parent Direction ID. `@org/shared-maps` owns the lazy,
browser-only Neshan MapLibre adapter; deployment supplies the Web Map key through
the environment rather than embedding it in a library.

## App Feature Entry Pattern

Each mounted panel feature has a discoverable folder under
`apps/panel/src/app/<feature>/`. Keep only app-specific route composition there:
paths, API prefixes, current company/session/permission adapters, language signals,
and a lightweight RouterOutlet host. Keep page content, forms, tables and stores in
`libs/panel/<feature>` or the relevant shared/transport library.

```text
apps/panel/src/app/
  app.routes.ts                 # lazy mount only
  driver/
    driver.routes.ts            # panel providers/permissions -> library route factory
    driver.page.ts               # thin <router-outlet> host
libs/panel/drivers/src/lib/
  driver.routes.ts              # reusable route factory and typed configuration
  ui/                           # actual list/detail/editor/Person UI
libs/transport/drivers/data-access/
  src/lib/                      # DTO adapters, API, scoped NgRx SignalStore
```

The central router should lazy-load the local entry, and that entry should compose
the public feature library route factory. Do not duplicate the library's page
components in `apps/panel`, and do not move app credentials, preference stores,
company IDs, or role decisions into a reusable library.

Authentication, layouts, forms, and theme exist today. A library-owned company
search/table and basic create/edit forms are mounted at `/companies`,
`/companies/new` and `/companies/:companyId/edit`, with private client rendering.
Production/development acceptance uses controlled fixtures, not live DB approval.
Legacy `/companys`, `/companys/add` and `/companys/detail/:companyId` deliberately
redirect to those new routes. `/client/:companyId` mounts the company shell with
route-validated, matching server detail and no browser-stored selected company.
The authenticated `/workspace` landing is now library-owned with an app-provided
reactive text adapter and company-selection link. Company reads are prepared in
guards and committed only after successful navigation; canceled/error navigation
cannot publish another company's context. Approved membership/action policy,
media/delete semantics, complete business CRUD, scheduling,
assignments and realtime remain migration work. Do not present planned folders as
implemented features.

The lazy `/client/:companyId/people` page is mounted, but its app-owned access
adapter deliberately denies live Person reads pending approved membership/read
permissions. Controlled alternate-consumer unit tests verify real search/paging
and selection through the API; panel browser tests verify the fail-closed gate,
responsive controls, private reload and logout. Neither is live ownership proof.

Departure-time list/create/edit pages are mounted at
`/client/:companyId/departure-times`, `/new` and `/:id/edit`, with deliberate
redirects from the legacy `shift-time` list/add/detail paths. App-owned access
remains denied pending company/entity permission approval. The feature itself
supports explicitly enabled alternate consumers, preserving exact TimeSpan input,
field errors, dirty-navigation confirmation and safe unconfirmed-save handling.
Its bounded collection has no fabricated paging, total count or exhaustive-lookup
claim. Delete and schedule-calendar semantics remain gated. Protected outlet
teardown may precede route deactivation on logout; editor guards accept a null
component without preventing local-first sign-out.

Driver list, onboarding, detail and edit pages are mounted lazily at
`/client/:companyId/drivers`, `/new`, `/:id` and `/:id/edit`; legacy `add` and
`detail/:id` paths deliberately redirect. Driver records use persisted business
Person IDs, with separately authorized People detail and mutation operations.
The panel enables driver-list searches for Admin/Manager and company Operators;
the resolved route company must match the request, and Operators must also match
their authenticated company claim. The backend overrides non-admin company IDs
from that claim. Driver detail and Person-backed create/edit are enabled for
Admin/Manager only because the backend's Operator detail/update paths do not yet
enforce per-entity company ownership. Those writes use the independently scoped
People API. Driver upsert assigns the linked Identity Driver role; Person creation
has account/message side effects, so the app limits them to Admin/Manager roles.
Document replacement is bounded by the cookie-BFF aggregate request limit.
Document removal and driver deletion are not exposed pending backend semantics
and retention decisions. See the driver checklist for controlled verification
versus live-backend acceptance evidence.
Driver list and Person selection use the shared Spartan Autocomplete wrapper;
file selection and current/replacement previews use Spartan Attachment. Driver
copy is bilingual and reads the live PreferencesStore language signal. Detail and
edit child routes clear inherited breadcrumb data so the Drivers crumb keeps its
company-list link.

Read [BUSINESS_DOMAIN.md](../../docs/BUSINESS_DOMAIN.md) for business scope and
evidence. Use [the main migration TODO](../../docs/migration/TODO.md) and its
linked feature files for active task status. The older
[migration plan](../../FEATURE-MIGRATION-PLAN.md) preserves planning history;
[CORE-THEME-TASKS.md](../../CORE-THEME-TASKS.md) retains theme validation evidence.
Those checklists are not substitutes for this architecture contract.

## Dependency Rules

```text
app composition
    -> reusable domain feature / generic shared feature
        -> domain data-access / generic data-access
        -> shared presentation / Spartan primitives
            -> narrowly scoped pure utilities and models, where permitted
```

Keep generic shared libraries independent of transport features. Keep data-access
independent of components, dialogs, layout, and application navigation. UI emits
typed intent; a feature container coordinates stores, API calls, and navigation.
Use public aliases instead of reaching into another library's `src/lib` files.

Enforce boundaries in both `eslint.config.mjs` and `sheriff.config.ts`. Nx tags
and Sheriff's source-path module mappings are separate systems; configure both.
The current data-layer Nx rule permits `type:data` dependencies only. If adding
a models/util library requires a new edge, update the specific rules deliberately
and test that edge. Do not assume Sheriff permission alone makes it valid.

For a future transport domain, use concrete boundaries such as:

```text
libs/transport/company/data-access/   # DTOs, adapters, API, scoped state
libs/transport/company/feature/       # lazy routes, containers, explicit forms
libs/shared/ui/data-table/            # only when the first real table requires it
```

These are proposed locations, not existing public APIs. Add `scope:transport`
and appropriate `type:*` classifications, then explicitly allow the consuming
app to use them. Do not classify everything as shared to bypass domain ownership.
Split further UI/util libraries when a concrete reuse boundary appears.

## State, Forms, and Tables

### State Ownership

| Kind of State                                                | Owner                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Credentials and unsaved form drafts                          | Component-local writable signals and Signal Forms.                |
| Open/closed UI, draft CSS text, transient selections         | The nearest component unless multiple workflows truly share them. |
| Records, load/save status, API errors, workflow coordination | Feature- or route-scoped NgRx Signal Store.                       |
| Session and genuinely application-wide appearance            | Explicit application-level providers with isolated configuration. |
| Shareable filters, page, sort, and selected parent context   | URL parameters, adapted to typed state.                           |

Use `withState` for source state, `withComputed` for derived state, `withMethods`
for functions only, and `withProps` for non-method helpers where required. Do not
put observables or services into `withMethods`. Avoid duplicate sources of truth
and effects that repeatedly copy loaded entities over a user's editable draft.

Cancel superseded reads and reject stale completions. Scope request identity by
session, company, parent ID, filters, pagination, and effective dates where relevant.
Handle reused route components when an ID changes; do not rely only on destruction
to clear company-sensitive records or table selection. Prevent duplicate mutations,
keep drafts on failure, and invalidate only the affected scoped data after success.

### Forms

Use a typed local model and schema-based Signal Forms validation. Follow the
workspace Angular skill for non-null draft defaults; explicitly map empty UI
values to the backend's nullable/omitted values. Reuse `@org/ui-forms` for compatible
inputs, with Spartan field/label/error composition. Do not add a native `name`
attribute to an element controlled by Angular's `FormField`.

Show invalid semantics and styling after blur or submission, not on untouched
fields. Use the supported submit helper to mark/focus invalid fields. Expose
typed submit outputs from presentational forms; let feature containers handle
async success, errors, and navigation. Do not store passwords in a global store,
logs, local storage, or transferred server HTML.

For an SSR-rendered interactive form, do not accept input before hydration owns
the Signal Forms model. The shared login uses `afterNextRender` readiness and
disabled controls; retain the delayed-JavaScript browser regression when changing it.

### Tables

Inspect the installed `@tanstack/angular-table` v9 declarations and examples before
coding; do not copy a v8 adapter tutorial. The first company read table consumes
`@org/ui-data-table`, extracted as a typed server-page composition using existing
Spartan table/button/alert primitives. It intentionally offers no implicit
cross-page selection or local full-dataset filtering/sorting. Further controls and
full feature/live-backend acceptance remain tracked in the migration checklist.

Use server filtering/sorting/paging only when the endpoint supports it. Explicitly
adapt table page indices to the backend convention. Never apply a full-dataset
client filter or select-all claim to only one server page. Define selection across
pages and reset it on company/session changes. Avoid a second cache that duplicates
SignalStore ownership without a concrete reason.

## Authentication and Theme

`provideAuth(config)` owns a scoped HttpClient and auth interceptor together with
its configuration and session. Do not register that interceptor again. In HTTP
unit tests, put `provideHttpClientTesting()` after `provideAuth(...)`.
An alternate backend can implement the exported `AuthBackend` contract.

Credentials are restricted to the configured origin and API path boundary. Refresh
is single-flight with bounded retry and session-epoch protection; late responses
must not restore a logged-out session. Unconfigured auth must not block unrelated
HTTP. `requireRoles` denies navigation with `false` rather than assuming a safe
redirect destination. Backend authorization remains mandatory.

Panel uses `provideAuth({ apiUrl: '/api', mode: 'cookie', ... })`. Its browser
stores no access or refresh tokens, including in local/session storage, Angular
state, or transferred HTML. A persistent HttpOnly cookie contains only a random,
HMAC-authenticated session handle. HTTPS uses `__Host-auth-session` with `Secure`,
`SameSite=Lax`, `Path=/`, and no Domain. Plain HTTP is permitted only with an
explicit loopback development origin and loopback connection. The existing
default bearer mode remains available for already supported alternate consumers;
it is in-memory only and is not used by panel.

The Node-only entry must never be exported from the browser barrel. Sheriff
tracks the server and pure claims entry points separately; keep both aliases and
architecture registrations valid. The app mounts `createAuthBff` at `/api` before
SSR and must not proxy that path directly to the bearer backend, including during
development. The BFF derives the tenant from the first DNS label of the entered
email domain (`admin@root.com` becomes `root`), validates it, and binds it to the
server session. Login sends `{ email, password }` with that tenant header. The BFF
sends the session-bound tenant and bearer credential upstream,
not browser-supplied Authorization, Cookie, tenant, or proxy-host headers.

Login, refresh, and logout are POST operations requiring the exact configured
Origin and `X-Auth-Request: 1`; unsafe proxied operations have the same checks.
Direct backend token/logout routes are blocked. Authentication responses contain
validated metadata only; refresh is single-flight with bounded retries and logout
cannot recreate a deleted server session. The browser also prevents a pending
logout from restoring its still-present cookie or clearing a subsequent login.
No SSO is assumed. Backend authorization remains mandatory on every operation.

Both login and workspace use SSR/hydration. Before rendering, the BFF validates
the session against the upstream permissions endpoint, refreshes expired access
credentials when possible, and supplies metadata through Angular's request
context. Guards wait for restoration instead of allowing SSR unconditionally.
Backend permissions rejection with 401 also triggers one server-side refresh even
when JWT expiry still looks valid locally. A proxied endpoint's 401 can use that
same one-refresh budget and retry its original request once; a 403 never triggers
refresh. Concurrent refreshes share one flight and late stale requests reuse
already-rotated stored credentials. Temporary upstream failures do not clear the
HttpOnly cookie, including during SSR; rejected refresh credentials invalidate
the stored session and require a new login.
Authenticated SSR API reads forward only the session cookie to the fixed
`AUTH_PUBLIC_ORIGIN` BFF, never to an origin inferred from request headers; SSR
mutations are rejected. That public origin must be reachable from the SSR process.
The browser independently restores through `/api/auth/session`. Do not transfer
private HTTP responses; all API and SSR HTML responses use `Cache-Control: no-store`.

### Cookie BFF Deployment

Panel's SSR host uses `environment.apiUrl` as its upstream API base; an explicit
`AUTH_API_URL` overrides it. The browser still calls same-origin `/api/auth/login`;
the BFF forwards to the transport backend's `/api/tokens/get-by-email/` endpoint.
The backend URL is therefore not expected in the browser's Network request URL.

Local development defaults to `http://localhost:4200` with a cryptographically
random, server-only secret generated on startup. No manual server variables are
needed for the standard development command. For another port/origin, explicitly
set `AUTH_PUBLIC_ORIGIN` to match it. The random development secret is never built
into browser JavaScript. Production bundles never use these development defaults,
even if their runtime mistakenly sets `NODE_ENV=development`.

In production, set the public origin and stable server secret explicitly;
missing/invalid configuration keeps the API unavailable with HTTP 503:

| Variable              | Contract                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `AUTH_API_URL`        | Optional override of `environment.apiUrl`, including `/api`; HTTPS except explicit loopback upstreams.       |
| `AUTH_PUBLIC_ORIGIN`  | Exact frontend origin; defaults to `http://localhost:4200` in development, required HTTPS in production.     |
| `AUTH_SESSION_SECRET` | Strong server-only secret of at least 32 bytes; ephemeral in development, required explicitly in production. |
| `NODE_ENV`            | Runtime mode; the Angular production environment always enforces production restrictions.                    |

Keep the external Host header when reverse proxying to this SSR server; forwarded
host headers are deliberately not trusted. Terminate TLS at the deployment edge,
do not cache authenticated HTML/API responses, protect the upstream from browser
token access, and apply deployment-level login rate limiting.

The default `createMemorySessionStorage` is bounded to 10,000 sessions and a
12-hour absolute lifetime. Browser reloads retain login, but restarting the
single server process signs users out and old cookies fail closed. Use one worker
for this default. Before deploying multiple replicas or requiring restart
persistence, supply shared TTL-enforcing `AuthSessionStorage` and distributed
refresh coordination. Its `replace` must atomically update an existing live
session only, never recreate one deleted by logout. Secure any external token
store with restricted access and encryption at rest. The default does not claim
multi-instance session continuity. Rotate the secret to invalidate existing handles.

The panel SSR terminal emits `[auth-bff]` diagnostics through the optional
`onDiagnostic` adapter. Only fixed operation/reason codes and HTTP status are
logged, never tokens, cookies, session IDs, email addresses, or upstream bodies.
`refresh-started`/`refresh-succeeded` indicate server-side rotation (not visible in
browser Network). `refresh-rejected` identifies a failed refresh;
`session-missing` identifies a cookie whose server-side entry is gone, such as
after restart or expiry; `cookie-invalid` can indicate tampering or a regenerated
development signing secret. Missing/invalid sessions cannot be refreshed because
their server-held credentials are unavailable. A reload alone does not recreate
them; sign in again. Surviving process restarts still requires the shared/durable
storage adapter and stable production signing secret described above.

The current BFF is a bounded JSON API proxy (1 MiB requests, 2 MiB responses,
10-second upstream timeout, no redirects). Binary downloads, streaming/realtime,
larger uploads, and endpoint-specific field-error mapping require explicit future
adapters; do not silently route them around cookie authentication.

Use one ThemeStore per application/document and an app-specific storage key.
ThemeStore alone owns palette/version variables, geometry, and the root dark
class. Direction preferences own `dir`/`lang`; do not let them overwrite theme.
Preserve the complete installed CDK directionality API, including writable
`valueSignal`, for Spartan overlays.

SSR renders theme defaults. Stored preferences restore after hydration; validate
storage and catch denied/malformed access. Accept validated CSS custom-property
declarations, not arbitrary stylesheets or resource-loading values. Reset/removal
must clear old overrides before reapplying derived defaults. Use semantic readable
text tokens rather than raw primary color for text on surfaces: white is a valid
primary preset, not a valid white-card heading color.

## Feature Delivery Workflow

1. Read this guide, the project lesson skill, applicable `.agents` skills, and
   existing implementations. If using a reference checkout such as Press ID,
   verify its current files before inventorying or copying behavior.
2. Add `[ ]` tasks to the appropriate migration checklist. Define the route,
   roles, company scope, API contract, reuse boundary, empty/error states, and
   acceptance flow before coding. Do not infer behavior from a dormant demo.
3. Search existing library APIs and Spartan exports. Decide whether to extend an
   existing library or generate a concrete new boundary. Load the Nx generation
   skill before scaffolding, inspect generator help/source, and dry-run first.
4. Generate with Bun/Nx. Add public aliases, Nx tags, Sheriff mappings, and the
   precise allowed edges. Remove generated placeholders. Do not generate parallel
   visible Agent Manager worktrees unless explicitly requested.
5. Implement typed wire DTOs and pure adapters, then the API and scoped store.
   Confirm real endpoint spelling, envelopes, field errors, pagination, IDs,
   date/time and currency conventions. Never use production as a dev fallback.
6. Implement explicit presentational components and local Signal Forms. Reuse or
   extract controls/functions/layouts with typed inputs/outputs and public exports.
   Avoid app imports, fixed tenant/company IDs, branding, or mount paths in libraries.
7. Export a library route factory and add an app-local feature entry folder at
   `apps/panel/src/app/<feature>/`. Put app-specific paths, providers, company/session
   permissions and language adapters in `<feature>.routes.ts`; add only a thin
   RouterOutlet host if the route tree needs one. Have central `app.routes.ts` lazily
   import that entry. Keep actual pages/forms/stores inside the reusable feature
   library, and keep provider/route entries separate from heavy runtime UI exports
   when needed to retain actual lazy chunks.
8. Add consumed Helm directories to Tailwind's explicit `@source` list. Keep shared
   tokens and logical CSS properties; check RTL/LTR, density, radius, responsive
   layout, keyboard navigation, and semantic error feedback.
9. Verify adapters/stores/forms, public APIs and alternate consumer configuration,
   then test the real browser flow in development and production. Include races,
   access denial, context changes, hydration, and mutation failures, not just success.
10. Update `[X]` only after implementation and required verification pass. Record
    mocked versus live-backend coverage and unresolved backend decisions honestly.

Do not run simultaneous builds into the same `dist/apps/panel` directory. Serialize
the build, restart the preview server, and test matching manifests/assets.

## Adding Another App

Reuse the existing libraries; do not copy the panel app or login/theme source.
The new app owns bootstrap/SSR policy, paths, branding, deployment settings, a
unique theme storage key, and any direction adapter.

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { authGuard, provideAuth } from '@org/auth-data-access'
import { createAuthRoutes, provideAuthFeature } from '@org/auth-feature'
import { provideTheme } from '@org/theme'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideTheme({ storageKey: 'another-app.theme.v1' }),
    provideAuth({
      apiUrl: '/api',
      mode: 'cookie',
      tenant: 'root',
      loginUrl: '/sign-in',
      afterLoginUrl: '/home',
    }),
    provideAuthFeature({ brandName: 'Another app' }),
    provideRouter([
      ...createAuthRoutes({ path: 'sign-in', title: 'Sign in' }),
      {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('./home.page').then(m => m.HomePage),
      },
    ]),
  ],
}
```

This is a composition example, not a complete generated app: supply `HomePage`,
SSR/hydration and private-cache policy if enabled, cookie BFF/deployment settings,
theme/font CSS imports, Tailwind sources, and architecture registrations. Adapt
`AUTH_APPEARANCE` when providing runtime language/theme controls. Project slots
into `AuthLayout`/`AppLayout` instead of building a second shell implementation.
Load `ThemePanel` from `@org/theme-ui` in an appropriate deferred boundary.

The current aliases target internal Nx source libraries. Publishing to a separate
repository/package registry is a separate packaging decision, not an existing
promise of publishable artifacts.

## Verification and Completion

Discover actual targets instead of guessing them:

```powershell
bun nx show project panel --json
bun nx show project shared-theme-ui --json
bun nx g @nx/angular:library --help
bun nx run panel:test
bun nx run panel:lint
bun nx run panel:build
bun nx run panel-e2e:typecheck
bun nx run panel-e2e:e2e --args="--project=chromium --headed"
```

Run the new library's own tests/lint/typecheck where configured, plus each affected
consumer. Use zoneless TestBed, HTTP fixtures, RouterTestingHarness, and real
browser tests. For an already-running production SSR preview, set `BASE_URL`;
set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` to use installed Chrome when necessary.
The production host/cache/API-policy check is intentionally skipped in development.

For isolated verification, set `PANEL_E2E_SERVER=development` or `production`
with an HTTP loopback `BASE_URL` containing an explicit port. Playwright then
starts and tears down the matching local server and refuses existing listeners;
production mode requires the matching `panel:build` output first. Omitting the
option retains external `BASE_URL` and existing default-server behavior. Managed
mode rejects remote origins, credentials and non-origin paths.

A feature is done only when its real reusable implementation, consumer wiring,
contract tests, permissions, error/empty/loading behavior, RTL/mobile behavior,
lazy/bundle budget, and checklist evidence are complete. Report live-backend and
cross-browser gaps; a mocked login is not staging acceptance.

For concrete mistakes and proven fixes, read the
[project workflow skill](../../.agents/skills/ttab-angular-workflow/SKILL.md).
