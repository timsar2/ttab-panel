# Driver PWA Feature Implementation Checklist

## Project Structure

- [x] Create `libs/driver/feature/project.json` (library project config)
- [x] Create `libs/driver/feature/tsconfig.json`
- [x] Create `libs/driver/feature/tsconfig.lib.json`
- [x] Create `libs/driver/feature/tsconfig.spec.json`
- [x] Create `libs/driver/feature/eslint.config.mjs`
- [x] Create `libs/driver/feature/src/test-setup.ts`
- [x] Create `libs/driver/feature/vitest.config.ts`
- [x] Register `@org/driver-pwa-feature` path alias in `tsconfig.base.json`

## Core Library Files

- [ ] Create `libs/driver/feature/src/lib/driver.api.ts` (Driver API service)
- [ ] Create `libs/driver/feature/src/lib/driver.login-config.ts` (login injection tokens)
- [ ] Create `libs/driver/feature/src/lib/driver.routes.ts` (route factory, role guard)
- [ ] Create `libs/driver/feature/src/lib/ui/login.page.ts` (onboarding + phone/OTP)
- [ ] Create `libs/driver/feature/src/lib/ui/driver-shell.ts` (drawer navigation)
- [ ] Create `libs/driver/feature/src/lib/ui/route-selection.page.ts` (route cards, trip start)
- [ ] Create `libs/driver/feature/src/lib/ui/route-management.page.ts` (tabs + filters)
- [ ] Create `libs/driver/feature/src/lib/ui/live-trip-map.page.ts` (map + station panel)
- [ ] Create `libs/driver/feature/src/lib/ui/station-operations.page.ts` (passenger/absent)
- [ ] Create `libs/driver/feature/src/lib/ui/profile.page.ts` (identity/profile)
- [ ] Create `libs/driver/feature/src/lib/ui/vehicle-profile.page.ts` (vehicle details)
- [ ] Create `libs/driver/feature/src/lib/ui/document-upload.page.ts` (Driver docs)
- [ ] Create `libs/driver/feature/src/lib/ui/support.page.ts` (support tickets)
- [ ] Create `libs/driver/feature/src/lib/ui/driver.css` (shared styling)
- [ ] Create `libs/driver/feature/src/index.ts` (public API exports)

## App Wiring

- [ ] Update `apps/driver/src/app/app.routes.ts` to mount driver routes
- [ ] Update `apps/driver/src/app/app.config.ts` with auth + preferences
- [ ] Update `apps/driver/src/styles.css` with source globs

## Verification

- [ ] Run `nx typecheck driver-pwa-feature`
- [ ] Run `nx lint driver-pwa-feature`
- [ ] Run `nx build driver`
