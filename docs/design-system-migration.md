# Design System & Shared Components Migration

Status: implemented for `panel`, `driver`, and `passenger`. The frontend already runs
as an Nx monorepo (package manager: Bun, Angular 22, Vite/Vitest, Tailwind v4, Spartan
Helm). This document records the shared-workspace structure, the dependency boundaries
that keep it maintainable, and the steps to onboard future apps to the same design
system.

## 1. Shared workspace layout (Nx)

```
front/
├── apps/
│   ├── panel          # transport admin (desktop shell)
│   ├── driver         # driver PWA (mobile-first shell)
│   ├── passenger      # passenger portal
│   ├── shop           # example (unchanged)
│   └── api            # example (unchanged)
├── libs/
│   ├── shared/
│   │   ├── theme/
│   │   │   ├── data-access   # ThemeStore, ThemeConfig, palettes, derive helpers (@org/theme)
│   │   │   └── ui            # ThemePanel customization sheet (@org/theme-ui)
│   │   ├── layout            # AppLayout + AuthLayout projected shells (@org/layout)
│   │   ├── platform          # providePlatformApp, PreferencesStore, route factories (@org/platform)
│   │   ├── auth              # auth data-access + feature
│   │   ├── ui                # forms / data-table compositions
│   │   └── maps
│   ├── transport/            # domain features (vehicles, drivers, scheduling, …)
│   ├── driver/feature        # driver PWA feature (now uses shared AppLayout)
│   └── passenger/feature     # passenger feature (now uses shared AppLayout)
└── libs/spartan/             # locally owned Spartan Helm primitives (sidebar, …)
```

Design tokens live in `libs/shared/platform/src/styles/base-theme.css` (imported by
`global.css`), and the theme engine lives in `libs/shared/theme/data-access` (`ThemeStore`
via `provideTheme`). The shared sidebar shell is `AppLayout` in
`libs/shared/layout/src/lib/app-layout.ts`, re-exported through `@org/layout`.

Import aliases are declared in `tsconfig.base.json` (`@org/layout`, `@org/theme`,
`@org/theme-ui`, `@org/platform`, `@org/driver-pwa-feature`,
`@org/passenger-pwa-feature`, …).

## 2. What was unified

### Theme system (single source of truth)

- Tokens: `base-theme.css` defines primitives, semantic tokens, component tokens
  (`--sidebar`, `--card`, `--primary`, …), typography stacks, radii, shadows, and the
  Tailwind `@theme inline` layer.
- Engine: `ThemeStore` (NgRx signal store) + `provideTheme()` apply tokens as CSS
  variables and `data-*` attributes on the root element; persisted to localStorage.
- All three apps import the shared stylesheet (`apps/*/src/styles.css`:
  `@import '../../../libs/shared/platform/src/styles/global.css';`) and wire the engine
  through `providePlatformApp({ …, routes: appRoutes })` in their `app.config.ts`.
- `driver` and `passenger` already adopt the panel design system: same tokens, same
  `ThemeStore`, same Tailwind/semantic color surface. No per-app theme overrides.

### Sidebar / shell component (single source of truth)

- `AppLayout` (`libs/shared/layout`) is the projected Hlm Sidebar shell used by panel
  (`CompanyShell` → `AppLayout`) and now by `driver` and `passenger`.
- `driver-shell.ts` and `passenger-shell.ts` were refactored from app-local drawer /
  custom-header shells into thin consumers of `AppLayout`. They supply:
  - `navigationItems` (`LayoutNavItem[]`) — the single nav definition,
  - `layoutBrand` projection — app brand,
  - `layoutHeader` projection — user info + sign-out + theme toggle,
  - default projection — `<router-outlet />` for feature pages.
- On mobile `AppLayout` collapses the sidebar to an offcanvas drawer, so the driver
  PWA keeps a mobile-friendly navigation without a duplicate drawer implementation.

## 3. Dependency boundaries (Sheriff)

`sheriff.config.ts` enforces the direction `apps -> domain features ->
data-access/shared -> utils` and forbids libraries from importing `apps/*`:

- `scope:driver`, `scope:passenger`, `scope:panel` may depend on
  `scope:shared`, `scope:ui`, `scope:transport`, `scope:platform`.
- `scope:platform` may depend on `scope:shared`, `scope:ui`, `scope:transport`.
- `scope:shared` may depend on `scope:shared` and `scope:ui`.
- `scope:ui` may depend only on itself.

This means `driver`/`passenger` consume `@org/layout`, `@org/theme`, and
`@org/platform` but never the reverse, so a change to the shared theme or sidebar is
made in one place and flows to all apps.

## 4. Onboarding a new app to the design system

1. Generate the app: `bun nx g @nx/angular:application appName` (style: css, unit test
   runner: vitest-analog, e2e: playwright), then register its entry point in
   `sheriff.config.ts` `entryPoints` and add a `scope:<app>` module rule.
2. In `apps/appName/src/styles.css`:
   ```css
   @import '../../../libs/shared/platform/src/styles/global.css';
   @source './app';
   @source '../../../libs/shared';
   ```
   Add `@source` entries for any consumed local libs/spartan directories so Tailwind
   generates their utilities.
3. In `apps/appName/src/app/app.config.ts`, compose the shared platform providers:
   ```ts
   export const appConfig: ApplicationConfig = {
     providers: providePlatformApp({
       id: 'appName',
       brandName: 'App Name',
       auth: { … },
       routes: appRoutes,
     }),
   };
   ```
4. Build the app shell from `AppLayout` (`@org/layout`) with projected `layoutBrand`,
   `layoutHeader`, and a default-projected `<router-outlet />`; supply navigation as
   `LayoutNavItem[]`. Do not duplicate a drawer or theme engine in the app.
5. Register route factories (`createAuthRoutes`, `createWorkspaceRoutes`,
   `createCompanyShellRoutes`) from `@org/platform` / `@org/transport-shell-feature`
   rather than re-implementing login or shell routing.
6. Validate: `bun nx run appName:lint`, `bun nx run appName:test`,
   `bun nx run appName:build`, and run Sheriff:
   `bun nx run-many --target=lint --projects=appName,shared-layout,shared-theme-data-access`.

## 5. Maintenance model

- Theme change: edit `base-theme.css` (tokens) or `theme.store.ts`/`theme-palettes.ts`
  (engine) once in `libs/shared/theme`; all apps pick it up on next build.
- Sidebar change: edit `AppLayout` in `libs/shared/layout` once; panel, driver, and
  passenger all inherit it.
- Nav labels/items: define per app in its shell's `LayoutNavItem[]`; the rendering is
  shared.
- Keep shared libs free of app imports (`apps/*`, app-specific branding, app navigation)
  per the FEATURE-MIGRATION-PLAN reuse contract so they stay reusable by any consumer.

## 6. Validation commands (run from `front`)

```
bun nx run driver:lint          # or passenger / panel
bun nx run driver:test
bun nx run driver:build
bun nx run driver:typecheck     # via tsc -p tsconfig.app.json --noEmit where no nx target exists
bun nx run-many --target=lint,test --projects=driver,passenger,panel,shared-layout,shared-theme-data-access,shared-theme-ui
```
