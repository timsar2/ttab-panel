# Company Context and Protected Shell TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** route-owned server-checked company read context and configurable lazy
shell are delivered. Approved membership/action permissions, full operational
navigation and remaining acceptance gates are still open (Q01-Q04 and Q23).

## Library Ownership and Dependencies

Generate reusable company-context data-access and transport-shell feature/UI
libraries with Bun/Nx and public provider/guard/route/navigation contracts. Reuse
`@org/layout`; never place a new shell, page, navigation component, or guard in
`apps/panel`. Replace the existing app-local placeholder workspace when delivering
the real library-owned workspace, rather than copying its implementation pattern.

Depends on [authentication](01-authentication.md) and the minimal read/search
capability from [companies](04-companies.md), not all company CRUD.

## Tasks

[X] CONTEXT-01 Deliver auth-independent projected authentication/application layout primitives and current CDK directionality compatibility.
[ ] CONTEXT-02 Confirm authorized company membership, tenant distinctions, actor permissions, and the authoritative company lookup contract.
[X] CONTEXT-03 Generate reusable company-context and protected-shell libraries with public configuration and no panel imports.
[X] CONTEXT-04 Make route company ID authoritative, validate it, load authorized context, and reject mismatches, invalid IDs, missing companies, and denied access.
[X] CONTEXT-05 Implement reusable company search/selection and navigation intent without treating the legacy always-true selection guard as valid policy.
[X] CONTEXT-06 Handle parameter changes in reused routes; cancel prior context loads and reject late responses after switching company or session.
[ ] CONTEXT-07 Clear company-scoped records, selections, drafts, and realtime subscriptions on context loss, logout, or access revocation.
[X] CONTEXT-08 Compose reusable responsive navigation, breadcrumbs, account/logout actions, and truthful scope/loading/error states with app-owned metadata.
[X] CONTEXT-09 Mount protected domain routes through reusable factories and supply a matching private client-rendering/cache policy from the app.
[X] CONTEXT-10 Preserve established company deep links or deliberate redirects without hardcoding mount paths inside library components.
[ ] CONTEXT-11 Verify manager/operator navigation against approved backend permissions without equating hidden links with authorization.
[X] CONTEXT-12 Test two consumers with different mount paths, branding, navigation configuration, and company defaults.
[ ] CONTEXT-13 Verify login -> company selection -> authorized company workspace -> logout, including direct links and context switches.
[X] CONTEXT-14 Verify library boundaries, RTL/mobile keyboard navigation, theme/sidebar modes, overlay direction, and production build budgets.

## Evidence

Record approved membership/permission decisions, route-context tests, consumer
configurations, and browser results. The existing authenticated placeholder does
not complete this workstream.

### 2026-11-09: Route Context and Protected Company Shell

- Reused `@org/transport-company-data-access` for `CompanyContextStore` rather than
  generating a project per store. Generated `@org/transport-shell-feature` with Nx
  tags, public alias and Sheriff mapping; its route factory lazily imports the UI.
- IDs are canonical positive short integers from the current route. The backend
  company-detail action must return the same ID; no table row, browser storage,
  demo ID or always-true guard establishes context. Invalid/missing/denied/mismatched
  and failed reads have explicit fail-closed UI states. This uses current backend
  read authorization, not an invented approval of manager membership policy.
- Authentication restoration is sequenced before company loading. Context clears
  before parameter loads, on cancellation/session changes and shell destruction.
  Reads are canceled and epoch-checked; children and their outlet require a ready
  context. Failed loads cannot display the previous company's child view.
- Company selection emits app-owned navigation commands or a callback. Panel
  preserves `/client/:companyId`; the shell factory receives the full path,
  parameter name, API URL, brand, login/selection links and navigation metadata.
  App `client/**` is client-rendered, with the host's existing no-store policy.
- Company data tests: 25 passing, including 15 context regressions. Shell route
  tests: 2 passing, with `/client/:companyId` and `/fleets/:id` plus different APIs.
  Existing company feature tests, affected lint/typechecks, panel tests and the
  consumer production build pass without raised budgets.
- Controlled headed Chrome passed against the matching production SSR preview
  (4000) and existing default Nx development server (4200):
  `bun nx run panel-e2e:e2e --args="--project=chromium --headed --grep=company"`.
  Both tests pass: table/search, and login -> selection -> company workspace ->
  reload -> mismatch/denial/invalid ID -> logout -> denied direct link. Private
  company text is absent from reload HTML; mobile overflow/44px logout and earlier
  table RTL/LTR/keyboard checks pass.
- Fixtures are not approved live membership/role acceptance. CONTEXT-02/11/13
  remain open for that approval. CONTEXT-07 remains open for future CRUD/realtime
  consumers; CONTEXT-08/12/14 need complete operational navigation, breadcrumbs,
  account/sidebar/overlay and configuration coverage. The app-local authenticated
  landing still needs replacement with the library-owned landing composition.

### 2026-11-09: Library Landing, Navigation and Navigation-Commit Safety

- Replaced app-local `workspace.page.ts` and its test with generated library-owned
  `WorkspaceLanding` and `createWorkspaceRoutes`. Panel provides branding, mount,
  login/company links and reactive Persian/English text; no app import is present
  in the library. `/workspace` retains guarded SSR and local-first logout and
  now exposes a real company-selection link.
- Added metadata-driven child breadcrumbs with existing Helm primitives, account
  identity and mini/compact/icon-hover-compatible labeled navigation. Repaired
  breadcrumb tags and actual Angular/router/icons/utils peers; registered its
  Tailwind source and corrected RTL separator direction.
- Guard reads are staged privately by `prepare`, not published immediately.
  Children check `canEnterRoute`; matching detail activates on `NavigationEnd`.
  The route-scoped initializer discards pending reads on cancellation/error, even
  before the shell is instantiated. This closes the successful-read/denied-child
  boundary bug: `/client/6/records` stays active after company 8's child denies
  entry, with neither company 8 nor the previous child data displayed.
- Store and router regressions cover that canceled-navigation case and an
  independent read-only follow-up confirmed the reported bug is addressed.
  Alternate consumers vary landing paths, branding, locale text, API/mount/param,
  navigation labels and requested IDs; they cover child denial, breadcrumbs,
  role-filtered presentation and app-owned logout. No implicit company default
  or frontend-granted backend permission was introduced.
- Fixed modern-sidebar mobile overflow: 100% width plus outer margins exceeded
  the viewport. Mobile modern sidebars now use auto inline size, not hidden
  overflow or weakened acceptance.
- Final affected tests/lint/typechecks passed (10 targets): company data 26 tests,
  shell/landing 4, panel 12, plus browser-definition checks. Production and consumed
  breadcrumb builds pass with unchanged budgets and genuinely lazy landing/shell.
- Headed Chrome: full production suite on port 4000 passed 13 with 2 explicitly
  environment-dependent BFF tests skipped. Default-development company suite on
  4200 passed 2. Auth hydration, SSR/cache/host boundaries, theme persistence,
  contrast and mobile overlay regressions pass. Company checks cover all five
  sidebar modes in RTL/LTR at 375px, keyboard focus, 44px targets, reload privacy,
  direct links and logout. These are fixtures, not live policy approval;
  CONTEXT-02/11/13 and future consumer cleanup in CONTEXT-07 remain open.
