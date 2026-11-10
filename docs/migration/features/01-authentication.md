# Authentication TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** reusable login/session libraries and panel cookie-BFF integration
delivered; recovery, business permission mapping, replicated deployment, and live
acceptance remain pending. No SSO is assumed.

## Library Ownership and Gates

Reuse `@org/auth-data-access`, `@org/auth-feature`, `@org/auth-feature/ui`, and
`@org/layout`. Generate any recovery/reset pages, forms, guards, or helpers inside
these or an appropriate new Nx library, not `apps/panel`.
Depends on [company context](03-company-context-and-shell.md) for transport access.
Resolve BUSINESS_DOMAIN questions Q01-Q04 and the password-recovery token/delivery
contract before enabling the corresponding behavior.

## Tasks

[X] AUTH-01 Deliver configurable username/password login with backend adapter and safe normalized token/identity/role responses.
[X] AUTH-02 Deliver reusable Signal Forms login UI, projected auth layout, route factory, and alternate branding/mount-path tests.
[X] AUTH-03 Deliver in-memory SessionStore, authenticated/guest guards, safe return URLs, and local-first logout without fake sessions.
[X] AUTH-04 Scope auth configuration, HttpClient, interceptor, token, and tenant per independently configured injector; preserve parent/child isolation tests.
[X] AUTH-05 Deliver origin/path-restricted credentials, single-flight refresh, bounded retries, and protection against late login/refresh after logout.
[X] AUTH-06 Deny unauthorized roles without redirect loops and keep unrelated HTTP usable when authentication is unconfigured.
[X] AUTH-07 Deliver safe localized errors and hydration-gated controls; preserve slow-JavaScript and disabled/re-enabled validation regressions.
[ ] AUTH-08 Confirm current endpoint/tenant/expiry/revocation contracts in the approved development or staging environment without production writes.
[ ] AUTH-09 Confirm email recovery/reset request, delivery, token, content-type, expiry, and completion contracts; do not enable dormant phone/OTP variants by assumption.
[ ] AUTH-10 Generate reusable recovery/reset routes and Signal Forms components with safe success/error feedback and no identity/token disclosure.
[ ] AUTH-11 Verify recovery expiry, invalid/reused tokens, interrupted navigation, repeat submissions, and successful return to login.
[ ] AUTH-12 Agree and test the actual actor/action/company permission matrix with backend enforcement, not menu visibility alone.
[X] AUTH-13 Implement requested reusable HttpOnly-cookie BFF persistence, validated SSR session restoration, CSRF defenses, and authenticated/guest/role guards without browser token storage.
[ ] AUTH-14 Verify auth errors and logout clear company, feature, selection, and realtime state as those consumers are added.
[ ] AUTH-15 Verify all auth/recovery routes in an alternate application configuration, public SSR/private-cache policy, RTL/mobile flows, and live acceptance.
[ ] AUTH-16 Before replicated or restart-persistent deployment, wire a shared TTL-enforcing server session store with distributed refresh coordination and verify cross-worker logout/rotation; the default is explicitly single-process.

## Evidence

The delivered baseline is documented in `FEATURE-MIGRATION-PLAN.md`. Record live
backend and recovery evidence here separately; controlled token fixtures are not
production or staging acceptance.

## Cookie Session Contract

Panel explicitly selects same-origin `mode: 'cookie'` at `/api`. The reusable
Node entry `@org/auth-data-access/node` adapts the transport backend's bearer
contract without changing that backend. Cookies contain random signed handles;
access/refresh tokens remain server-side. Login, session, and refresh return only
validated public identity/role/expiry metadata. No raw credentials enter browser
storage, transferred HTML, or the browser SessionStore.

Authenticated and guest guards restore sessions before deciding navigation on
SSR and browser reloads; the existing role guard denies unauthorized navigation
without redirect loops. Roles are presentation/navigation checks, not a substitute
for backend authorization or an agreed company permission matrix.

The default bounded server session store preserves browser reloads, caps sessions
at 12 hours, and intentionally signs users out on server restart. Opaque cookies
cannot restore deleted sessions after logout or restart. HTTPS cookies are
HttpOnly/Secure/SameSite=Lax with `__Host-` scope; insecure access is loopback-only
development. Mutations require exact Origin plus a custom header. See the
[deployment contract](../../../apps/panel/ARCHITECTURE.md#cookie-bff-deployment)
for required environment variables, single-worker limitations, and proxy bounds.

Source inspection confirmed transport login/refresh endpoints, `tenant` header,
token envelope, and the authenticated permissions endpoint. The profile endpoint
has a backend deleted-user filtering defect, so session validation uses the
permissions endpoint instead. Backend access tokens currently have long validity
and are not immediately revoked by its logout; this change revokes the BFF
session but does not claim to fix backend JWT revocation or account-policy checks.

## Validation: 2026-11-09

- `shared-auth-data-access:test`: 104 passing tests, including cookie metadata,
  restored/denied guards, issuer-origin isolation, trusted SSR API reads, concurrent
  refresh, pending logout, and login/logout races; existing bearer consumers remain covered.
- `shared-auth-data-access:test-node`: 22 passing tests for cookie flags, upstream
  validation, tampering/duplicate cookies, CSRF, token-route bypass, bounded bodies,
  refresh/absolute expiry, deleted-session replay, replacement login, and restart behavior.
- `shared-auth-feature:test`: 35 passing tests; `panel:test`: 13 passing tests.
  jsdom reports its existing unsupported CSS-layer parsing diagnostics, not test failures.
- Auth browser/server typechecks, panel/browser-test lint, and the panel production
  SSR/browser build passed. Browser-test lint retains warnings for explicitly gated
  deployment-only checks. Login and workspace remain lazy chunks within the budget.
- Headed Chrome against the production SSR bundle: all 13 tests passed, including
  real BFF login/reload/SSR/logout/CSRF against `support/auth-upstream.mts`, plus
  existing mocked failure, hydration, mobile, RTL/LTR, and theme regressions.
- Headed Chrome against Angular's development server: all 13 applicable tests passed;
  the separately identified production host/cache-policy test was excluded.
- These are controlled fixtures, not live development/staging backend acceptance.
  Real HTTPS cookies are also asserted in Node tests; an externally deployed TLS
  proxy, distributed session adapter, backend authorization policy, and other browser
  engines remain separate acceptance gates. Required variables are documented in
  the architecture contract; no production endpoint or account was used.

## API Configuration Follow-Up

- Panel's SSR adapter now reads its upstream URL from `environment.apiUrl`, with
  `AUTH_API_URL` retained as an explicit server deployment override. Standard
  localhost:4200 development initializes a random server-only secret automatically;
  production still requires an explicit HTTPS origin and server secret.
- Login forwards to the legacy panel's exact `/api/tokens/get-by-email/` endpoint
  with `{email,password}` and a tenant header derived from the entered email's
  first domain label, as confirmed by the user's corrected deployed API curl.
  `/api/auth/login`
  remains only the local cookie-BFF
  facade; it is not an endpoint expected on the transport backend.
- Configuration precedence, default local initialization, and production fail-closed
  behavior are covered by four additional Node tests (26 total). Existing auth
  tests remain 104 passing; auth/panel lint, Node typecheck, and production build pass.
- A development-server smoke check without `AUTH_API_URL` or `AUTH_SESSION_SECRET`
  returned 401 for an anonymous session and 400 for an invalid login body instead
  of 503. Neither request contacted the upstream or submitted real credentials.
- Compared all implemented request adapters against the legacy panel services and
  transport backend controllers. Only email login's trailing slash differed; both
  cookie-BFF and alternate bearer callers now preserve it. Verified upstream
  contracts: `POST /api/tokens/get-by-email/`, `POST /api/tokens/refresh`,
  `GET /api/personal/logout`, `GET /api/personal/permissions`,
  `POST /api/v1/companys/search`, and `GET /api/v1/companys/{id}`. The company
  search paging/filter payload matches. Tenant selection now follows the user's
  confirmed per-email rule rather than a fixed `root` header.
  Cookie facade routes intentionally differ from upstream routes to hide tokens
  and protect state-changing operations; unimplemented legacy APIs were not fabricated.
- Follow-up transport contract regressions passed: 45 HTTP/adapter tests, 25 company
  data/context tests, 2 company feature tests, and 4 shell tests (76 total). Existing
  jsdom CSS-layer diagnostics remain non-failing; this is fixture/source validation,
  not a login against a real production account.

## Email-Derived Tenant Follow-Up

[X] AUTH-17 Recover session validation/backend 401 with one server-side refresh,
preserve transient-failure cookies, and add safe diagnostics and race regressions.

- User explicitly selected keeping the HttpOnly SSR proxy after reviewing the
  direct-browser token exposure tradeoff. `/api/auth/login` is a frontend-server
  adapter, not an upstream API endpoint; its metadata is derived from the actual
  returned JWT and server session. Real tokens stay on the server.
- Corrected business entity claim mapping to prefer the real token's namespaced
  `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid`, preserving existing
  unqualified-SID token support. A `companyId` claim of `0` still means no company.
  The claim regression passes with 118 browser-side unit tests and 31 Node tests.

- `admin@root.com` sends `tenant: root`; `user@finance.com` sends `tenant: finance`.
  Domain labels are lowercased and validated before use as headers. Invalid email
  domains and header-injection inputs fail before contacting the backend.
- Cookie sessions retain the derived tenant server-side for permissions checks,
  SSR restoration, refresh, proxy requests, and logout. Browser tenant headers and
  login-body tenant overrides are ignored. `AUTH_TENANT` no longer selects a BFF
  tenant; simultaneous users in different tenants do not share mutable tenant state.
- The alternate bearer adapter also sends `{email,password}`, derives its login
  tenant from the email, and retains it for subsequent requests and token rotation.
- Tests cover root/non-root domains, case/whitespace normalization, invalid domains,
  tenant-header overrides, concurrent sessions, refresh and logout. Auth browser
  tests: 117 passed; Node tests: 31 passed. No real credentials were submitted.
- Auth/panel/browser-test lint and browser/Node typechecks pass. The follow-up
  application build and browser smoke are blocked by unrelated concurrent forms
  compilation: `lookup-select.ts:29` combines `[disabled]` with `[formField]`
  (NG8022). This does not supersede the earlier build evidence; it records the
  current worktree's integration gap, and that forms change was not modified here.

## Refresh Recovery: 2026-11-10

- Session restore now tries one refresh when backend permissions validation returns
  401 before local JWT expiry; expired JWTs retain their existing refresh path.
  The same budget covers a proxied business endpoint's 401 and one retry. A 403
  is an authorization failure, not a refresh trigger.
- Coalesced refresh protects rotation across concurrent session requests; delayed
  requests use the latest stored credentials instead of replaying a consumed
  refresh token. Logout cannot be undone by late refresh results.
- Temporary upstream errors preserve session cookies, including SSR failures.
  Rejected refresh credentials remove the stored session and clear the cookie.
  Missing sessions remain fail-closed; restart persistence was not added.
- Safe terminal diagnostics distinguish cookie/session loss, upstream access
  rejection, refresh start/success/rejection, and temporary upstream failures.
  Diagnostic consumers cannot break authentication, and no credentials, identifiers,
  raw errors, or upstream bodies are passed to them.
- Node integration tests: 43 passed, including the new recovery/race/diagnostic
  cases. Browser auth unit tests, login feature tests, panel tests, Node typecheck,
  auth/panel lint, and the production SSR build also pass. Existing jsdom CSS-layer
  warnings are non-failing. The earlier forms compilation blocker no longer
  reproduces in the current worktree. Controlled fixtures were used, not live accounts.
- Headed Chrome cookie-BFF acceptance: all three tests pass against the development
  SSR server, including intentional backend rejection of an unexpired token,
  exactly one counted upstream refresh, metadata-only restoration, and an
  authenticated reload. Test control routes are confined to the loopback fixture,
  never mounted in the deployed application. Temporary servers were stopped.
