# Inspection App and Panel TODO

This checklist describes work for the standalone app at `front/apps/inspection`
and the Admin/Manager review experience in `front/apps/panel`. The existing API and
stored-procedure contract were checked against
`transport-backend/todo/DEVELOPER_HANDOFF_FA.md` and
`transport-backend/todo/BACKEND_IMPLEMENTATION_TODO.md`.

`[X]` means implemented and verified in code/tests. `[ ]` means pending. No frontend
task may bypass backend role/ownership checks. This document does not claim live
database installation or acceptance.

## Backend Identity Foundation

- [x] Seed the `Inspection` Identity role using `FSHRoles.DefaultRoles` and the
      existing `ApplicationDbSeeder` pattern so startup creates it in new databases and
      adds it to existing Identity databases.
- [x] Seed the Inspector role's `Permissions.Inspections.View` and `.Create` claims,
      plus Admin/Manager search/review claims, through the existing idempotent
      RoleManager/RoleClaims path.
- [x] Include the `Inspection` role in token role claims and allow that role to
      create a visit; take `InspectorId` only from the authenticated SID.
- [x] Allow Inspector detail reads only when the requested visit's `InspectorId`
      matches the authenticated SID. Admin/Manager keep global detail access.
- [x] Keep global list, status changes, defects and corrective-action writes
      restricted to Admin/Manager; do not expose those permissions to Inspector tokens.
- [ ] Assign the seeded `Inspection` role to each intended inspector account using
      the existing Admin user-role management flow. The seeder must not grant the role
      to arbitrary or all existing users.
- [ ] Verify role assignment and refreshed tokens in the deployed identity
      database. Existing tokens do not gain a newly assigned role until reissued.

## Inspector App

- [x] Replace the generated Nx welcome screen/routes in `apps/inspection` with the
      authenticated Inspection app shell, shared login/session bootstrap, navigation,
      and explicit `Inspection` role guard. Non-Inspector sessions go to access denied.
- [x] Use the configured same-origin `/api` BFF for API calls, preserve the
      environment-specific API selection, and never put credentials or bearer tokens
      in browser storage or request bodies.
- [x] Create the independent `@org/inspection-feature` library and reuse the existing
      `@org/transport-inspection-data-access` API/models/store. Keep Inspector UI
      separate from Panel-scoped pages; do not add a parallel HTTP/database client.
- [x] Build an insert-only inspection visit form with date-only `InspectionDate`,
      a selected Driver and Vehicle, Description (maximum 1000 characters), and all
      twelve required checks: TiresCondition, LightsCondition, SeatsCondition,
      HasSeatBelt, HeaterCondition, AirConditionerCondition, HasFirstAidKit,
      HasFireExtinguisher, HasTurnSignals, WipersCondition, WindowsCondition, and
      HasSafetyVestAndWarningTriangle.
- [x] Derive InspectorId from the authenticated backend identity; never accept an
      InspectorId, CompanyId, or status value from the form payload.
- [x] Load Driver/Vehicle choices using the authenticated Inspector's company claim
      and preserve backend integer/smallint/date constraints; no browser-supplied
      company ID is trusted.
- [x] POST new visits with `Id=0`, prevent duplicate saves while pending, and
      handle uncertain responses without blindly retrying an insert-only operation.
- [x] On successful creation, use the returned visit ID to navigate to the saved
      detail and load it through the Inspector ownership check.
- [ ] Add an Inspector "My inspections" list only after an authorized backend
      endpoint filters by the authenticated InspectorId. `Inspection.uspGetVisitList`
      has no Inspector/company filter; never fetch its global results and filter in
      the browser.
- [ ] Show an Inspector the authoritative review status and Admin result. The
      current detail procedure/DTO does not return status, so do not infer status from
      the create response or an old list row.
- [ ] Expose defect/corrective-action workflows to Inspectors only after the
      backend authorizes Inspector-owned visits for those operations. Current backend
      handlers authorize Admin/Manager only.

## Admin and Manager Panel

- [x] Reuse and verify the existing Panel Inspection feature and shared
      `@org/transport-inspection-data-access`; do not fork a second list/detail model.
- [x] Keep Admin/Manager list access global because the list procedure has no
      company filter. Clearly disclose that the selected company does not scope this
      list; keep bounded paging, allowlisted sorting, and no fabricated total count.
- [x] Keep `StatusTypeId` from list output as a status-name string. Detail currently
      returns neither numeric status nor rowversion.
- [x] Add an Admin/Manager status selector for IDs 1/2/3 with explicit confirmation.
      The backend still does not enforce transitions or accept a description update.
- [ ] Support Admin description edits only after a backend update endpoint and
      authorization/audit contract are supplied. `Inspection.uspSetVisit` is
      INSERT-only; do not POST an existing ID or imply it edits a visit.
- [x] Refresh cached Admin list/detail state after an accepted status update.
- [ ] Return the committed status/update result to the owning Inspector through an
      authorized API response; current detail omits status and no update description.
- [x] Keep Admin/Manager global review, Inspector own-visit access, and unrelated
      tenant/company scopes separate in routes and services. Frontend guards are UX,
      not backend authorization.

## API and Business Contract Gates

- [ ] Add/approve an Inspector-scoped list endpoint before implementing "My
      inspections"; current `Inspection.uspGetVisitList` cannot safely serve it.
- [ ] Add/approve a detail/read response that includes current status for an
      Inspector-owned visit. The current `Inspection.uspGetById` output omits it.
- [ ] Define the Admin description-change operation. No current API or stored
      procedure updates visit description; do not work around this in frontend code.
- [ ] Confirm who may register defects and corrective actions (Inspector versus
      Admin/Manager) before exposing those controls in the Inspector app.
- [ ] Define and enforce allowed status transitions server-side before claiming a
      complete review workflow. The UI confirms Admin/Manager status writes, but the
      current setter accepts any status ID and does not enforce a state machine.
- [ ] Confirm backend validation for Driver/Vehicle company membership before
      claiming frontend lookups enforce this relationship.
- [ ] Verify deployment/database readiness before enabling live workflows. The
      handoff reports invalid Inspection DDL; frontend tests cannot prove the database
      is installable or the procedures are deployed.
- [ ] Configure production auth-BFF runtime values (`AUTH_API_URL`,
      `AUTH_PUBLIC_ORIGIN`, and `AUTH_SESSION_SECRET`) before accepting production
      login. Local fixture login does not verify production cookie/session settings.

## UX, Accessibility, and Verification

- [x] Add bilingual English/Persian copy, RTL/LTR layouts, responsive forms,
      keyboard/focus behavior, and accessible validation/loading/denied/error states.
- [ ] Test Inspector versus Admin/Manager role guards, own-visit authorization,
      expired sessions, company changes, missing records, empty results, paging/sorting,
      invalid values, server failures, and duplicate-save protection with controlled
      API fixtures.
- [x] Add browser acceptance for Inspector create/detail and Admin list,
      detail, status/review flows at mobile, tablet, and desktop sizes.
- [x] Run Inspection app, Panel, shared data-access tests/typechecks/lint and
      production builds. Record mocked and live API/database evidence separately.
- [x] Update this checklist as tasks are verified; keep status/description, role
      assignment, SQL/DDL, and live-acceptance gates unchecked until their prerequisites
      are approved and evidenced.
