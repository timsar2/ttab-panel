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
