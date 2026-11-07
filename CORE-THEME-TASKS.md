# Core and Theme Implementation

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
The login is a UI foundation, not a working authentication integration. No backend
endpoint or session contract was supplied, so valid submission must report that
authentication is not configured and must never create a fake authenticated user.

## Architecture

Application-wide infrastructure belongs in `apps/panel/src/app/core`.
The lazy login boundary belongs in `apps/panel/src/app/features/auth`.
Shared design tokens remain in `libs/base-theme.css`, with panel branding in
`apps/panel/src/theme.css`. UI controls use the existing local Spartan Helm library.
Credentials stay component-local and are never persisted or added to a global store.

## Running

From `front`, run `npm exec nx run panel:serve` for development.
Production: `npm exec nx run panel:build`, then
`node dist/apps/panel/server/server.mjs` (default port 4000, overridden by `PORT`).
Local SSR hostnames are allowlisted. Set `NG_ALLOWED_HOSTS` to a comma-separated
list of actual deployment hostnames before starting the production server; never
use a wildcard allowlist in production. No API proxy or SSO is configured.

Theme and direction start as light/Persian RTL on every full page load. Toggles
apply during the current application lifetime; preferences are intentionally not
read from browser storage before hydration, keeping server/client markup aligned.
Add new shared UI component source directories to `styles.css` when needed so
Tailwind generates their utility classes without scanning unrelated projects.

## Validation Commands

`npm exec nx run panel:test`

`npm exec nx run panel:lint`

`npm exec nx run panel:build`

`npm exec nx run panel-e2e:e2e -- --args="--project=chromium --headed"`

Set `BASE_URL` to test an already-running production SSR server instead of starting
the development server. If bundled Chromium cannot be downloaded, set
`PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` to use an installed Google Chrome.

## Tooling Notes

The existing jsdom 22 test environment logs non-failing CSS parser warnings for
Ng Icons' `@layer` stylesheet. Actual CSS is verified separately in Chrome.
The generated Spartan `utils` source has pre-existing non-null-assertion lint
warnings; its implementation is intentionally left unchanged.
Firefox/WebKit, physical devices, and screen-reader behavior are not yet audited.

## Completed Validation

- Production browser/server build and six consumed Spartan library builds pass.
- All 19 zoneless unit tests pass (preferences, route integration, login).
- Four Chrome end-to-end tests pass against production SSR, including initial
  HTML, host rejection, no Zone.js, validation, theme/direction, and mobile layout.
- Panel and browser-test lint and browser-test type checking pass.
- Consumed Spartan library lint passes with the existing `utils` warnings above.
- Desktop/mobile visual review passes after validation timing and contrast fixes.
  Light button hover/active text contrast measures 8.70:1 / 10.19:1; dark measures
  8.49:1 / 10.41:1. Secondary controls have at least 44px touch targets.
