# Shared Application Platform TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Scope:** Consolidate cross-application platform composition for `apps/panel`,
`apps/driver`, and `apps/passenger` behind one reusable Nx library and public API.
The platform owns generic auth, shell/layout, theme, routing, HTTP policies, and
SSR infrastructure. App branding, route trees, environment/deployment values,
and domain permissions remain explicit consumer configuration.

## Required Shared Modules

- Browser application composition: zoneless change detection, hydration, global
  error handling, router features, and shared initialization.
- Authentication: provider composition, session policy, login/guest/auth/role
  guards, safe return URLs, shared login routes/components, and appearance adapter.
- HTTP policy: scoped authenticated client, auth interception, safe bounded retry,
  common error handling, and credential-origin restrictions.
- Generic shell/UI: auth and app layouts, responsive side navigation, navigation
  types, reusable shared components, and theme settings entry points.
- Theme/design system: theme model/store, palette/token generation, storage
  policy, shared base styles, RTL/LTR document synchronization, and CDK directionality.
- Routing: route factories, safe URL/return-target helpers, and typed route/query
  context utilities where Angular's native APIs do not suffice.
- Node/SSR infrastructure: cookie BFF mounting, session restoration, SSR context,
  cache/security headers, static assets, safe diagnostics, and server readiness.
- Testing/infrastructure: platform test providers and reusable contract fixtures.

Business/domain feature routes, company access policies, application-specific
branding, API URLs, origins, session secrets, and feature permissions are not
platform defaults. They are passed through typed app manifests and deployment
configuration. Node-only exports must remain isolated from the browser entry point.

## Tasks

[X] PLAT-01 Create one tagged `@org/platform` Nx project with explicit browser and
Node-only public entry points, internal module boundaries, public API tests, Nx
module-boundary rules, and Sheriff registrations.
[X] PLAT-02 Centralize shared browser providers and app manifest normalization;
make all four app configs thin calls to the shared platform composition API.
[X] PLAT-03 Centralize auth and HTTP policies, including login routes, guards,
session restoration, safe return targets, origin restrictions, bounded retries,
and public test helpers without duplicating auth interceptors. Existing focused
auth modules remain internal platform implementation dependencies.
[X] PLAT-04 Centralize generic auth/app layouts, side navigation, shared component
exports, theme settings UI integration, theme storage naming, tokens, and
directionality behavior.
[X] PLAT-05 Centralize route policy utilities and server render-mode defaults while
retaining app-owned routes and explicit private/client-rendered exceptions.
[X] PLAT-06 Centralize the Express/Angular SSR and cookie-BFF pipeline in a Node-only
platform server factory; reduce all four `server.ts` files to typed deployment
adapters and preserve request-scoped session/privacy behavior.
[X] PLAT-07 Migrate Panel, Driver, and Passenger to the same browser/server APIs;
keep only app ID, brand, routes, origins, environment, and domain adapters local.
[X] PLAT-08 Migrate all four application source trees from direct shared auth,
theme, layout, UI and shell imports to the single `@org/platform` browser API and
use `@org/platform/node` for server composition. Keep focused Nx libraries as
implementation dependencies behind this public application boundary.
[X] PLAT-09 Verify alternate-app configuration, login/guard behavior, theme and
direction isolation, SSR/BFF behavior, retry bounds, route rendering, library
boundaries, and production builds for all four apps.

## Evidence

**Implementation evidence:** all four apps call `providePlatformApp()`, mount
shared login, guards and workspace routes through `@org/platform`, and use the
Node-only SSR/BFF and render-route factories through `@org/platform/node`. App
style entrypoints import the platform global stylesheet; Tailwind source globs
remain local because feature dependencies differ. Platform tests cover provider
defaults, route guards/context, preference synchronization, and server render policy.

**Verification evidence:** `bun nx run-many -t typecheck,lint,test -p platform
panel driver passenger` passed (9 tasks), and `bun nx run-many -t build -p panel
driver passenger` passed (24 tasks). `bun nx run-many -t typecheck-node,test-node
-p shared-auth-data-access` passed (45 BFF tests). Panel, Driver, and Passenger
SSR each returned HTTP 200 for `/login`. Per-app cookie namespace tests verify
that sessions do not cross apps sharing a host. All four apps select one shared
upstream by environment: loopback HTTP at `http://localhost:5000/api` in development
and the existing Panel HTTPS API in production. `AUTH_API_URL` remains the server-only
override. The backend `Host` launch profile listens HTTP-only for the local Node BFF;
the optional `HostHttps` profile is for direct browser/API debugging, not BFF calls.
Development public origin defaults to its local port and the session secret is
ephemeral.

Cookie names are namespaced by app ID; production deployments still need per-app
public origins and shared session storage if an app runs multiple server replicas.
