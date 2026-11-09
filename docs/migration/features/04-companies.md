# Company Management TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** source-backed read/search/table slice implemented with library tests;
company CRUD, authorized context selection, and browser/live acceptance remain open.

## Library Ownership and Dependencies

Generate reusable `libs/transport/company/data-access` and `/feature` boundaries
when implementing the first slice. Components, forms, stores, APIs, and route
factories belong in libraries; the app mounts/configures them only.
Use [shared controls](00-foundation-and-shared-controls.md),
[auth](01-authentication.md), and [company context](03-company-context-and-shell.md).
Coordinate first search/table/context delivery as one slice, not a circular
requirement to finish every checklist first.

## Contract Gates

Confirm Q01-Q04/Q11: company access, types, required identity/geography fields,
coordinate behavior, and deletion/history rules. Preserve backend `companys`
spelling while using Company in business/domain naming.

## Tasks

[ ] COMPANY-01 Confirm types/search/detail/create/update/delete contracts, envelopes, validation, pagination, and authorized company visibility.
[X] COMPANY-02 Generate and register the reusable library boundaries, public aliases, Nx tags, and Sheriff mappings.
[ ] COMPANY-03 Implement typed read/write adapters for company type, contact/address, city/province, logo, coordinates, and IDs.
[ ] COMPANY-04 Implement scoped search/list/detail state with URL-owned filters/pages and cancellation/stale-response handling.
[X] COMPANY-05 Deliver the real TanStack v9/Spartan company table and jointly extract shared table primitives from this working consumer.
[ ] COMPANY-06 Implement explicit local Signal Forms for create/edit with agreed requirements and accurate server-field feedback.
[ ] COMPANY-07 Reuse shared geography, logo/document, phone, and coordinate controls; do not block numeric coordinate entry on map-provider approval.
[ ] COMPANY-08 Verify logo replacement/removal and flat-read versus nested-write coordinate round trips without losing valid zero values.
[ ] COMPANY-09 Implement confirmed update/delete semantics, confirmation, duplicate-save protection, and scoped invalidation after mutations.
[ ] COMPANY-10 Keep company editing distinct from authorized context selection; do not silently change current scope after every save.
[ ] COMPANY-11 Export configurable routes/providers/components and preserve or redirect established company URLs deliberately.
[X] COMPANY-12 Test another consumer configuration with different mount paths and selection callbacks, without app imports.
[ ] COMPANY-13 Test invalid/denied/deleted companies, partial responses, backend errors, rapid searches, and context changes.
[ ] COMPANY-14 Verify complete CRUD and selection flows in zoneless RTL/LTR/mobile browsers with correct SSR policy and library/build checks.

## Evidence

Record contract decisions, fixtures versus live API acceptance, public consumer
tests, and the first login/company-selection acceptance milestone.

### 2026-11-09: Read/Search Slice

Generated `@org/transport-company-data-access` and
`@org/transport-company-feature`, with both Nx and Sheriff registrations. The
data layer decodes distinct company row/detail DTOs; validates short integer IDs
and coordinate ranges without discarding zero; preserves successful null detail;
and rejects a server-substituted company ID rather than authorizing the requested
workspace. Search is name/page only and uses a feature-scoped Signal Store with
cancellation, epoch checks, session cleanup, explicit denied/error states and no
global company cache. No writes or production API requests were performed.

`createCompanyRoutes` has consumer-owned path/API URL/heading/optional action intent,
with a lazy UI import. Panel mounts `/companies` with private client rendering.
Router tests cover `/companies` and `/organisations` with different API bases.
The shared TanStack v9/Spartan table is a real consumer, not a sample dataset.
Its optional action callback is not proof of authorized company selection.

Verification: company data tests (10), table tests (4), route consumer tests (2),
panel tests (13), affected lint/typecheck, Helm table build and final production
panel build passed. Earlier unrelated BFF build failure was resolved outside this
slice. The company route is genuinely lazy, with startup under the existing budget.
Controlled headed-Chrome acceptance passed in production and development: keyboard
name search, server paging, stale-row removal, denied/empty/error states, no exposed
diagnostics, RTL/LTR, 375px/1280px overflow and 44px paging targets. See FND-07 evidence
for exact commands and fixture limits. Alternate route tests invoke the supplied
typed action callback. This callback is intent, not authorized workspace selection.
CRUD/authorized-selection/full-feature acceptance checkboxes remain pending.

Contract evidence and remaining owner decisions are recorded in FND-04. In
particular, company visibility/membership must be enforced by the backend; logo
delete-only currently restores a deleted file path, nullable-city database behavior
is unverified, and deletion/history semantics require backend/product confirmation.
The read slice does not silently resolve those gates or mark COMPANY-01 complete.
