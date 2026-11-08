# Authentication TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** login/session libraries delivered; recovery, business permission
mapping, and live acceptance remain pending. No SSO is assumed.

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
[ ] AUTH-13 Preserve in-memory reload semantics unless a separately approved persistence/BFF contract is implemented; never silently add local-storage tokens.
[ ] AUTH-14 Verify auth errors and logout clear company, feature, selection, and realtime state as those consumers are added.
[ ] AUTH-15 Verify all auth/recovery routes in an alternate application configuration, public SSR/private-cache policy, RTL/mobile flows, and live acceptance.

## Evidence

The delivered baseline is documented in `FEATURE-MIGRATION-PLAN.md`. Record live
backend and recovery evidence here separately; controlled token fixtures are not
production or staging acceptance.
