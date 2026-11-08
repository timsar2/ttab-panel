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
- Generate every new feature/page/component implementation inside an appropriate
  Nx library, reusing an existing library where it owns the capability. Do not add
  new feature components under `apps/panel`; app files are composition only.
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

| Location / Public Entry                   | Responsibility                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/panel/src/app/app.config.ts`        | Compose providers, hydration, routing, auth/theme adapters, and directionality.                     |
| `apps/panel/src/app/panel.config.ts`      | App-owned API prefix, tenant, branding, and login/success paths.                                    |
| `apps/panel/src/app/app.routes.ts`        | Mount reusable auth routes and protect the workspace.                                               |
| `apps/panel/src/app/app.routes.server.ts` | Choose public SSR versus protected client rendering.                                                |
| `apps/panel/src/app/core/preferences/`    | Panel's direction/language adapter; not a second theme store.                                       |
| `@org/auth-data-access`                   | Configurable backend contract, in-memory SessionStore, HTTP interception, guards, and auth helpers. |
| `@org/auth-feature`                       | Auth presentation providers and the lazy login route factory.                                       |
| `@org/auth-feature/ui`                    | Explicit public entry for embedding `LoginForm` or `LoginPage`.                                     |
| `@org/layout`                             | Projected `AuthLayout` and `AppLayout`, independent of auth/theme stores.                           |
| `@org/ui-forms`                           | Reusable Spartan/Signal Forms input bridge.                                                         |
| `@org/theme`                              | Validated theme model, NgRx ThemeStore, palette/token generation, persistence, and safe custom CSS. |
| `@org/theme-ui`                           | Configurable Spartan customization sheet.                                                           |
| `libs/spartan/*`                          | Existing owned Helm source; inspect its actual exports before adding controls.                      |
| `libs/base-theme.css`                     | Shared semantic design tokens and base theme rules.                                                 |
| `apps/panel/src/styles.css`               | Font/CSS imports and explicit Tailwind source discovery.                                            |
| `apps/panel-e2e/`                         | Browser acceptance tests and reusable controlled API fixtures.                                      |

Authentication, layouts, forms, and theme exist today. The protected workspace is
a small authenticated composition, not completed company management. Company
selection, reusable tables, business CRUD, scheduling, assignments, and realtime
remain migration work. Do not present planned folders as implemented features.

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
coding; do not copy a v8 adapter tutorial. There is no completed shared data-table
library yet. Build the first real domain table, then extract its reusable typed
composition using Spartan table, paging, selection, and menu primitives.

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

Sessions currently stay in memory, so reload requires login. No SSO, persistent
token storage, or BFF cookie support is assumed. Public login uses SSR/hydration;
the protected workspace uses client rendering. Disable private HTTP transfer
caching. Add matching server-route policy when adding new protected routes.

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
7. Export a route factory or lazy feature entry. The app supplies paths, providers,
   branding, appearance callbacks, permissions, and success/forbidden destinations.
   Keep provider/route entries separate from heavy runtime UI exports when needed
   to retain actual lazy chunks.
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
SSR/hydration and private-cache policy if enabled, API proxy/deployment settings,
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

A feature is done only when its real reusable implementation, consumer wiring,
contract tests, permissions, error/empty/loading behavior, RTL/mobile behavior,
lazy/bundle budget, and checklist evidence are complete. Report live-backend and
cross-browser gaps; a mocked login is not staging acceptance.

For concrete mistakes and proven fixes, read the
[project workflow skill](../../.agents/skills/ttab-angular-workflow/SKILL.md).
