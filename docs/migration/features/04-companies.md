# Company Management TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** source-backed search/context, basic create/edit and logo preservation/
replacement are implemented and fixture-verified. Logo removal/delete semantics,
final requirements/membership approval and live acceptance remain open.

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
[X] COMPANY-03 Implement typed read/write adapters for company type, contact/address, city/province, logo, coordinates, and IDs.
[X] COMPANY-04 Implement scoped search/list/detail state with URL-owned filters/pages and cancellation/stale-response handling.
[X] COMPANY-05 Deliver the real TanStack v9/Spartan company table and jointly extract shared table primitives from this working consumer.
[ ] COMPANY-06 Implement explicit local Signal Forms for create/edit with agreed requirements and accurate server-field feedback.
[X] COMPANY-07 Reuse shared geography, logo/document, phone, and coordinate controls; do not block numeric coordinate entry on map-provider approval.
[ ] COMPANY-08 Verify logo replacement/removal and flat-read versus nested-write coordinate round trips without losing valid zero values.
[ ] COMPANY-09 Implement confirmed update/delete semantics, confirmation, duplicate-save protection, and scoped invalidation after mutations.
[X] COMPANY-10 Keep company editing distinct from authorized context selection; do not silently change current scope after every save.
[X] COMPANY-11 Export configurable routes/providers/components and preserve or redirect established company URLs deliberately.
[X] COMPANY-12 Test another consumer configuration with different mount paths and selection callbacks, without app imports.
[X] COMPANY-13 Test invalid/denied/deleted companies, partial responses, backend errors, rapid searches, and context changes.
[ ] COMPANY-14 Verify complete CRUD and selection flows in zoneless RTL/LTR/mobile browsers with correct SSR policy and library/build checks.

## Evidence

Record contract decisions, fixtures versus live API acceptance, public consumer
tests, and the first login/company-selection acceptance milestone.

### 2026-11-10: Confirmed Preserve/Replace Image Adapter

- Company logo uses the shared image/document picker, restricted here to actual
  backend image MIME/extension pairs. Phone remains shared SignalInput type tel,
  without an unapproved mask; geography and numeric coordinates remain reusable.
- `companyLogoUpload` validates full image data URLs, dotted extension/MIME and
  base64 shape. Full write preserves null for keep, emits extension/data/delete
  false for replace, omits client filename and rejects remove even if a caller
  bypasses static typing. The server generates its own file name.
- Root supplies a configurable 256 KiB UI budget, below its default BFF request
  envelope budget; no universal backend media-size policy is claimed. Image-only
  edits are dirty, pending/invalid reads cannot save, stale field errors clear on
  a new selection, and saved/context-destroyed data URLs are discarded.
- Tests: data 56 and company UI 9 pass; shared controls 51. Full production browser
  regression passes 14 with 3 explicit BFF-environment skips; clean managed dev
  company regression passes 3. Real blob previews, MIME/size rejection, unchanged
  create payload, exact replacement POST, cleanup, RTL/LTR and mobile are checked.
- Removal still deletes a file but restores the stale database path in the backend.
  It is not offered in company UI. COMPANY-08/09/14 remain partial for removal,
  confirmed deletion/history and full CRUD; COMPANY-01/06 retain policy gates.

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

### Confirmed Additional Mutation Gates

Source review reconfirmed the active logo delete-only defect in
`SetCompanyRequest.cs`: its null upload result falls back to the old path after
the old file has been removed. Inline company-type creation is also gated:
`CompanysController` passes domain `CompanyType` to the TVP helper, which casts to
`BaseSchema` and dereferences schema metadata absent from that domain object.
Do not expose either operation as working or invent a client workaround.

Writes are full-object POSTs: unchanged coordinates must be resent as a complete
pair with SRID 4326; `companyLogo: null` preserves the existing image. No province
ID belongs in writes. Nullable request/detail city conflicts with a non-null short
in the domain model; zero is not an approved no-city value. Available SQL contains
no readable definitions, so clearing behavior remains unverified. Backend owners
must resolve these gaps before corresponding tasks are checked; safe unaffected
read/context work has continued.

### 2026-11-09: Source-Backed Create/Edit and Safe Shared Controls

- `CompanyLookupsApi` reads byte-ID company types and short-ID provinces/cities
  using configurable versioned and version-neutral bases. Cities POST uses
  `{ provinceId, name }`; the backend caps its list at 1000, so it is not treated
  as an unbounded complete global city dataset.
- `CompanyEditorStore` owns cancellable detail/options/city reads, revision-based
  local drafts, explicit missing/loading/error states, single in-flight writes,
  field errors and session cleanup. Deleted detail never becomes create mode;
  substituted save IDs are rejected. Pending writes cannot update another session.
- Explicit local Signal Forms cover name/type, contacts/address, geography and
  numeric coordinates. Active backend name/type requirements and coordinate
  syntax/ranges are validated, without invented phone/calendar policy. Existing
  city/location clearing is fail-closed pending its confirmed contract. Field-
  linked backend messages cease applying once that draft value changes.
- Public POST save returns enveloped full `CompanyDetailsDto`, not the handler's
  integer. Adapters preserve zero in nested `{ lat, lng, srid: 4326 }`, retain
  submitted contact/address values, omit read-only province/names and send logo
  null to preserve the existing file. Media deletion/replacement was not faked.
- Shared lookup/coordinate/confirmation components are real form consumers.
  Dirty navigation supports keep/discard/Escape; pristine pending saves also
  await the result. Saves do not select company context. Returning to the list
  re-queries it rather than trusting a hidden cache.
- `provideCompanyFeature` and route factories form the light public entry;
  `@org/transport-company-feature/ui` explicitly exports page/editor without
  eager UI imports from that entry. Consumer write callbacks configure action
  visibility; panel mirrors current Admin/Manager controller checks, not a new
  approval of membership policy or replacement for server authorization.
- Panel deliberately redirects `/companys` to `/companies`, `/companys/add` to
  `/companies/new`, and `/companys/detail/:companyId` to the edit route. The
  separate `/client/:companyId` workspace remains server-checked. Private client
  rendering covers both management URL families.
- Tests: data 44, company UI/routes 8, transport 46, shared forms 25 and table 4,
  plus affected lint/typechecks and lazy production build/budgets. Production
  company browser suite passes 3; full regression passes 14 with 2 explicit BFF
  environment skips. Clean development company suite passes 3 on 4201. Fixtures
  cover create/edit, errors, duplicate saves, zero/full DTOs, city reset, unsaved
  flows, modal focus, keyboard, legacy redirects, RTL/LTR and mobile.
- COMPANY-03/06/07/08/09/14 remain open for full media, agreed identity/geography
  requirements, confirmed deletion/history and complete acceptance. A delivered
  basic form is not a substitute for those approvals or live DB verification.
