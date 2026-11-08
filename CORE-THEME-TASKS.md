# Core and Theme Implementation

## Updated Press ID Customization

[X] Inspect the newly pulled Press ID app and `msy-web/libs/shared/theme-ui`.
[X] Preserve the updated shared base tokens and remove conflicting panel indigo overrides.
[X] Implement reusable NgRx ThemeStore with the reference palettes, typography, geometry, and chrome settings.
[X] Port the Spartan customization sheet into reusable `@org/theme-ui`.
[X] Separate direction preferences from theme state and connect the auth appearance adapter to ThemeStore.
[X] Make sidebar/header/layout/container/density/radius/shadow settings affect the real projected layout and login controls.
[X] Add self-hosted Poppins/Roboto assets alongside Vazirmatn for the typography presets.
[X] Verify persisted settings, reset, safe custom CSS, authentication, and SSR hydration in the browser.
[X] Run Bun/Nx tests, lint, type checks, and production build; record final evidence.
[X] Expose CDK's writable direction signal so Spartan dialogs open correctly under the app's direction adapter.
[X] Verify readable headings/helper text and normal/hover buttons under white/red light/dark presets.

The sections below record the original foundation. Authentication is now provided
by the reusable libraries described in `FEATURE-MIGRATION-PLAN.md`, rather than a
standalone unconfigured login stub.

## Original Foundation

[X] Inspect Press ID, shared base theme, and the existing front workspace.
[X] Adapt the shared Spartan theme and Press ID palette with Persian-first typography.
[X] Configure the panel application for zoneless Angular, HTTP, routing, and SSR hydration.
[X] Implement request-safe NgRx signal-store preferences for RTL/LTR and light/dark mode.
[X] Implement a responsive Spartan-only username/password login with Signal Forms.
[X] Keep authentication integration explicitly unconfigured; do not add SSO or demo sessions.
[X] Add focused tests for core preferences, routing, and login validation.
[X] Configure Nx UI dependency boundaries and repair consumed Spartan package manifests.
[X] Address desktop/mobile visual review findings for validation timing, contrast, and touch targets.
[X] Verify production build, lint, tests, and browser behavior where tooling is available.

## Scope

Application: `apps/panel`. Existing shop and API examples remain unchanged.
The shared authentication integration remains intact; theme customization never
stores credentials or creates fake authenticated users.

## Architecture

Theme state and normalization belong in `libs/shared/theme/data-access` (`@org/theme`).
The customization sheet belongs in `libs/shared/theme/ui` (`@org/theme-ui`).
The shared auth libraries own the lazy login boundary, while projected layouts
consume CSS tokens and root data attributes without importing the store.
Shared design tokens remain in `libs/base-theme.css`, with panel branding in
`apps/panel/src/theme.css`. UI controls use the existing local Spartan Helm library.
Credentials stay component-local and are never persisted or added to a global store.

## Running

From `front`, run `bun nx run panel:serve` for development.
Production: `bun nx run panel:build`, then
`node dist/apps/panel/server/server.mjs` (default port 4000, overridden by `PORT`).
Local SSR hostnames are allowlisted. Set `NG_ALLOWED_HOSTS` to a comma-separated
list of actual deployment hostnames before starting the production server; never
use a wildcard allowlist in production. Development API proxying remains configured;
SSO is not added.

Direction starts as Persian RTL. Theme defaults match updated Press ID: light,
orange/purple, Poppins, full vertical sidebar, full-width content, 2px corners,
default density, and soft shadows. Theme choices persist under `panel.theme.v1`.
SSR renders defaults; browser settings restore after hydration to avoid mismatches.
There is intentionally no second, partial inline theme script to conflict with
the store. Storage failures and malformed values fall back safely.
All controls apply immediately except Custom CSS, which applies on Save. Clearing
the editor and saving removes prior overrides; Reset restores application defaults.
Only validated custom-property declarations are accepted, not arbitrary stylesheets.
The customization gear is available on login and the protected workspace.
Add new shared UI component source directories to `styles.css` when needed so
Tailwind generates their utility classes without scanning unrelated projects.

## Validation Commands

`bun nx run panel:test`

`bun nx run panel:lint`

`bun nx run panel:build`

`bun nx run-many --targets=test,lint,typecheck --projects=shared-theme-data-access,shared-theme-ui`

`bun nx run panel-e2e:e2e --args="--project=chromium --headed"`

Set `BASE_URL` to test an already-running production SSR server instead of starting
the development server. If bundled Chromium cannot be downloaded, set
`PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` to use an installed Google Chrome.

## Tooling Notes

The existing jsdom 22 test environment logs non-failing CSS parser warnings for
Ng Icons' `@layer` stylesheet. Actual CSS is verified separately in Chrome.
The generated Spartan `utils` source has pre-existing non-null-assertion lint
warnings; its implementation is intentionally left unchanged.
Firefox/WebKit, physical devices, and screen-reader behavior are not yet audited.

## Updated Theme Validation

- All 189 unit/integration tests pass across panel, auth, layouts, forms, and the
  two theme libraries (37 theme-store tests and 9 customizer tests).
- All 25 applicable test/lint/typecheck targets pass, including the three newly
  consumed Spartan components and Sheriff/Nx dependency rules.
- All 11 production Chrome checks pass: theme controls, persistence and reset,
  unsafe-storage normalization, custom CSS apply/removal, shell geometry/chrome,
  computed text contrast, authentication, SSR hydration, and host/API boundaries.
- The default development workflow passes 10 checks with only the production
  host/cache/API-policy check intentionally skipped.
- Final desktop/mobile visual review passes in RTL/LTR and light/dark. Headings
  measure at least 9.49:1 contrast, helper text at least 5.19:1, and tested
  white/red primary buttons retain readable normal/hover states.
- Production browser/server builds pass within the existing initial-bundle
  budget (approximately 412 kB). The customization sheet is deferred into its own
  lazy chunk instead of inflating initial startup.
- Poppins, Roboto, and Vazirmatn are self-hosted. The IRANSansX preset retains the
  reference CDN font declarations and falls back when that external font is unavailable.
- No live backend calls were needed for these checks; authentication uses the
  existing controlled fixtures. Firefox/WebKit and physical-device testing are
  not claimed.

## Original Foundation Validation

- Production browser/server build and six consumed Spartan library builds pass.
- All 19 zoneless unit tests pass (preferences, route integration, login).
- Four Chrome end-to-end tests pass against production SSR, including initial
  HTML, host rejection, no Zone.js, validation, theme/direction, and mobile layout.
- Panel and browser-test lint and browser-test type checking pass.
- Consumed Spartan library lint passes with the existing `utils` warnings above.
- Desktop/mobile visual review passes after validation timing and contrast fixes.
  Light button hover/active text contrast measures 8.70:1 / 10.19:1; dark measures
  8.49:1 / 10.41:1. Secondary controls have at least 44px touch targets.
