# Cross-Feature Parity and Release TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** migration-wide acceptance is pending. Existing auth/theme tests do not
complete business parity, live API acceptance, or production rollout approval.

## Ownership and Dependencies

Apply this gate to every delivered library and consuming application. It depends
on the detailed workstreams linked in the main list, including the gated
[service rules](21-service-eligibility.md). New test helpers and runtime validation
components must follow library ownership; app-specific E2E orchestration may live
in the app's existing E2E project.

## Tasks

[ ] RELEASE-01 Audit every detailed checklist against current code and evidence; do not mark a main feature complete while any detailed task remains pending.
[ ] RELEASE-02 Verify all new features/components/layouts/guards/services/utils are generated inside appropriate libraries and apps contain only composition/configuration.
[ ] RELEASE-03 Verify public APIs, alternate consumers/mount paths, no app imports in libraries, and both Nx/Sheriff boundaries without broad exceptions.
[ ] RELEASE-04 Complete legacy route inventory and explicit compatibility/redirect coverage for auth, companys, client/company scope, nested resources, maps, and support details.
[ ] RELEASE-05 Verify role/action authorization and cross-company entity-ID access against backend enforcement, including direct URLs and hidden-menu destinations.
[ ] RELEASE-06 Verify company/session transitions, reused route parameters, stale requests, cache keys, table selection, draft cleanup, and realtime teardown.
[ ] RELEASE-07 Verify concurrent refresh, late login/refresh after logout, revoked access, private transfer-cache exclusion, and credential origin/path isolation.
[ ] RELEASE-08 Verify complete create/edit/delete round trips for each supported entity, including picture preserve/replace/delete and normalized numeric/string IDs.
[ ] RELEASE-09 Verify paging totals/filter semantics, money units, date-only/time/calendar conversion, assignment boundaries, and agreed scheduling/eligibility rules.
[ ] RELEASE-10 Verify the first full login -> company selection -> authorized company workspace -> logout browser milestone and each subsequent business workflow.
[ ] RELEASE-11 Verify real map initialization/teardown, route/station geometry, live identity joins, stale/offline states, reconnect, and actual marker movement.
[ ] RELEASE-12 Verify zoneless change propagation, public SSR hydration, protected client rendering, disabled-until-hydrated forms, and complete CDK directionality.
[ ] RELEASE-13 Verify RTL/LTR, desktop/mobile, keyboard/screen-reader semantics, touch targets, theme presets, density, and readable normal/hover/error states.
[ ] RELEASE-14 Run affected Bun/Nx library and consumer tests, lint, typecheck targets, and serialized production builds; inspect real lazy chunks and existing budgets.
[ ] RELEASE-15 Run development and matching production browser suites, including production-only host/cache/API policy checks against a real preview server.
[ ] RELEASE-16 Confirm safe deployment API/hub/map configuration, approved secrets/key handling, allowed SSR hosts, and no production fallback or embedded credentials.
[ ] RELEASE-17 Record staging/live-backend acceptance separately from controlled fixtures, with resolved contract decisions and reproducible environment details.
[ ] RELEASE-18 Complete the agreed browser/device/accessibility acceptance matrix; document residual gaps instead of presenting Chromium-only checks as universal coverage.
[ ] RELEASE-19 Obtain product/backend agreement for unresolved BUSINESS_DOMAIN questions or explicitly defer the affected capability without fake completion.
[ ] RELEASE-20 Synchronize main/detailed task markers and architecture/domain documents with verified delivery evidence before migration completion.

## Evidence

Record date/commit, changed libraries, exact targets, fixture/live environments,
browser/device results, approved business decisions, and remaining release gaps.
Do not include credentials, production keys, tokens, or personal test data.
