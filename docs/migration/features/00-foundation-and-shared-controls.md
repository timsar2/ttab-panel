# Foundation and Shared Controls TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** partially delivered foundation; reusable business controls remain open.
Existing checks below record verified baseline work, not completed transport CRUD.

## Library Ownership and Dependencies

Reuse `@org/ui-forms`, `@org/layout`, `@org/auth-data-access`, and local Spartan
libraries. Generate concrete shared UI, transport-HTTP, lookup, and utility
boundaries only when their first consumer requires them. All new components and
helpers belong inside Nx libraries, never app feature folders.

Deliver the first table with [companies](04-companies.md); coordinate inputs
can use numeric entry before [maps](17-maps-and-geography.md) is approved.

## Tasks

[X] FND-01 Establish Bun/Nx tooling and the standalone zoneless Angular application baseline.
[X] FND-02 Establish reusable auth, projected layout, Signal Forms input, and theme libraries with public aliases.
[X] FND-03 Establish Nx and Sheriff dependency enforcement and the documented architecture/lessons workflow.
[X] FND-04 Confirm common transport API envelopes, error formats, page conventions, identifiers, and write/read DTO differences from authoritative contracts.
[X] FND-05 Generate the needed reusable transport HTTP/data adapter library without duplicating auth's scoped client or leaking credentials to other origins.
[ ] FND-06 Implement reusable typed error, pagination, ID, date-only/time, numeric, and money adapters only where domain contracts agree.
[X] FND-07 Build the first real company table and extract a typed TanStack v9/Spartan composition with columns, stable row IDs, actions, paging, and loading/empty/error states.
[X] FND-08 Define local versus server filtering/sorting and cross-page selection explicitly; never treat one server page as the full dataset.
[X] FND-09 Generate reusable confirmation and page/action compositions where existing Helm/layout exports do not already cover the need.
[ ] FND-10 Generate reusable scoped company/person/driver and province/city lookup components with cancellation and dependent-selection reset.
[X] FND-11 Generate reusable image/document controls with preview, MIME/size validation, replacement/removal contracts, and resource cleanup.
[ ] FND-12 Generate reusable date-only/Jalali display and time controls with tested calendar/timezone conversion, not silent UTC shifting.
[X] FND-13 Generate reusable coordinate input with range validation and map-adapter hooks without embedding a provider key or imposing unapproved geofences.
[ ] FND-14 Extract shared phone/mobile/email/plate validation functions only after confirming their intended requirements; keep domain-specific validators within the owning library.
[X] FND-15 Register every new library in Nx/Sheriff and every consumed Helm source in Tailwind; repair metadata from actual imports rather than blanket exclusions.
[X] FND-16 Test each public UI/utility API with more than one configuration or domain consumer, including pristine/disabled/touched Signal Forms behavior.
[X] FND-17 Verify real table/forms/dialog behavior, RTL/LTR, mobile, hydration, keyboard interaction, and production bundle budgets in consuming apps.

## Evidence

Baseline: `CORE-THEME-TASKS.md` and the root migration plan record prior foundation
validation. Add new target names, consumer tests, backend decisions, and browser
results here as shared controls are delivered. Do not mark proposed controls done.

### 2026-11-10: Media Control and Real Logo Consumer

- Generated `FileUploadControl` in existing `@org/ui-forms`, with a public typed
  keep/reading/invalid/replace/remove model. Image/document consumers configure
  MIME, dotted extensions, positive integer byte budget, context reset key and
  explicit removal permission. Documents get local information/download intent,
  never embedded active content. No remote image origin is inferred.
- Accepted files use guarded FileReader and owned blob previews. Superseded/
  canceled/context-reset reads are aborted and epoch-checked; blob URLs are revoked
  on replacement, reset, external keep, removal and destruction. Inputs/actions
  stay disabled until browser render ownership; SSR reads no FileReader/URL APIs.
- Real company forms support keep/replace, reject unsupported removal, protect
  image-only dirty drafts and clear local drafts/data URLs on destruction/session
  change. Current server paths are neither posted as uploads nor used for automatic
  remote previews. The configurable panel byte budget is UI resource policy, not
  a claimed backend business limit.
- DTOs match `LocalFileStorageService.cs` and `FileType.Image`: full image data
  URL, `.jpg/.jpeg/.png/.webp`, `deleteCurrentImage: false`, no writable Name
  assumption (server GUID). MIME/extension/header/base64 mismatches are rejected.
  Client checks are not a replacement for server validation or malware scanning.
- Mobile acceptance found intrinsic file/policy text overflow; min-width bounds
  and token/filename wrapping fix it without hiding document overflow. Widget and
  consumer checks cover invalid/oversized selection, real canvas PNG preview,
  exact upload body, acceptance reset, unchanged/no-file payload and 44px RTL/LTR.
- Shared forms 51 tests (26 media), company data 56 and company UI 9 pass, with
  affected lint/typechecks and production AOT/budgets. An independent read-only
  review found no concrete lifecycle/security defects in the media slice.
- Managed browser evidence: `PANEL_E2E_SERVER=development` with loopback BASE_URL
  4201 passes 3 company tests; `PANEL_E2E_SERVER=production` with BASE_URL 4000
  passes 14, with 3 explicit environment-dependent BFF skips. Set installed Chrome
  via PLAYWRIGHT_CHROMIUM_CHANNEL and run the existing headed Chromium Nx target.
  Playwright now owns readiness/cleanup and refuses to reuse unrelated listeners.
  Existing development auth emits NG02819 for duplicated credential options; that
  concurrent auth implementation was not changed here. No live backend is claimed.
- Generic removal is an explicit owner-handled intent. Company delete-only removal
  remains disabled due to the confirmed stale-path backend defect; FND-11 does not
  assert that COMPANY-08's backend-removal gate has been resolved.

### 2026-11-08: Authoritative Transport Contract Review (FND-04)

Source verification, not live-backend acceptance. Paths below are relative to
the enclosing TTab workspace. Controllers and handlers take precedence over the
legacy client's generic wrapper and advertised controller return types.

- `transport-backend/src/Host/Controllers/BaseApiController.cs` defines the opt-in
  `{ code, massage, result }` envelope. Success code is string `2000`; business
  failure is HTTP 400, normally code `400`. Preserve `massage` on the wire.
  Raw responses also exist: company-type creation returns `{ id }`, vehicle-type
  reads return arrays. Never globally unwrap every HTTP response.
- MVC validation returns validation-problem field `errors`;
  `Infrastructure/Middleware/ExceptionMiddleware.cs` and `ErrorResult.cs` instead
  return `messages`, `statusCode`, and optional diagnostic fields. Bare HTTP errors
  and raw string errors also exist. Normalize status separately from body codes;
  do not expose exception/source/support diagnostic details in user-facing errors.
- `Core/Application/Common/Models/PaginationFilter.cs` defaults to one-based page
  1 and size 10. `PaginationResponse.cs` returns `list` (possibly null) and required
  `pagination`: currentPage, totalPages, totalCount, pageSize, hasPreviousPage,
  hasNextPage. Company search supports name and paging, not generic server sorting.
  `Companys/SearchCompanyRequest.cs` derives count from the first row: an empty
  out-of-range page reports zero, not a reliable full-dataset count. Other endpoints
  return unpaged arrays; support alone has its own validated limits/sorting.
- Company IDs are numeric short integers; person/driver/passenger IDs are generally
  int, identity IDs may be strings, and some scalar results are long. No universal
  ID coercion or assumption that an association ID equals a person ID is valid.
- `Companys/CompanyDto.cs`, `CompanyDetailsDto.cs`, `SetCompanyRequest.cs` and
  `SetCompanyValidator.cs` establish separate row/detail/write DTOs. Name and company
  type are required. Detail has flat nullable lat/lng and string logo; writes use
  nested coordinate and upload objects, city ID but no province ID. POST creates
  and updates; there is no company PUT action. Missing detail can be success/null.
  Zero coordinates must survive adapters. Uploads use extension/data and
  deleteCurrentImage, not multipart or an existing-path string.
- `Host/Controllers/Company/CompanysController.cs` manually role-checks search
  despite AllowAnonymous and substitutes an operator's company claim on detail.
  Requested ID must be checked against returned ID before establishing context.
  Role-gated search does not establish manager company membership policy.

Remaining gates and owners: backend owner must confirm database paging/order,
delete scalar/history semantics, company membership enforcement, coordinate
clear/preserve and nullable-city behavior. Company logo delete-only currently
restores the old database path after deleting the file; do not claim removal works.
Product/backend owners must settle date-only/timezone and money precision/units
before shared semantic adapters. These are not gates on the confirmed envelope,
page-shape, or error-family implementation. No live service or production write
was used for this review.

### 2026-11-09: Verified First Transport/Table Slice

- Generated `transport-http` (`@org/transport-http`) with explicit per-endpoint
  decoders, configured base URL, safe endpoint paths, disabled transfer caching,
  error normalization, safe-integer checks and one-based paging adapters. It uses
  the existing consumer HttpClient, not a second auth chain. Date/money semantics
  remain gated; no shared date or money policy was invented for FND-06.
- Generated the actual company read consumer and `shared-ui-data-table`
  (`@org/ui-data-table`). The table uses installed TanStack v9 `injectTable`,
  `tableFeatures`, `rowPaginationFeature` and `FlexRender` with existing Helm table,
  button and alert primitives. Repaired table Nx tags and its actual utils peer.
- Company search performs name filtering and pagination on the server only. No
  client full-dataset sorting/filtering or cross-page select-all is offered.
  Optional row actions emit typed intent; they do not grant company access.
  Rows and requests are cleared/cancelled on search/session changes. No extra
  table cache or persistence was added. URL parameters own name/page/size.
- Unit evidence: `bun nx run-many -t test lint typecheck -p transport-http`
  passed (45 tests); company data-access passed (10 tests); shared table passed
  (4 tests); alternate company route consumers passed (2 tests). Panel test/lint
  passed (13 tests, with existing jsdom CSS-layer parse diagnostics).
  `bun nx run table:build` passed. The final 14-task test/lint/typecheck sweep for
  all four libraries and panel-e2e passed. The BFF suite's explicit environment
  skip annotations remain existing lint warnings.
- Earlier build gate: `bun nx run panel:build` initially failed in concurrent BFF work at
  `libs/shared/auth/data-access/src/server/auth-bff.ts:339`: Buffer is not assignable
  to BodyInit. This was resolved outside this slice; the final production build
  passed. Startup was 419.24 kB, below the unchanged 500 kB warning budget, with
  company-page in a real lazy chunk. No BFF implementation was edited here.
- Controlled browser acceptance passed using installed headed Chrome against both
  the matching production SSR preview (`BASE_URL=http://localhost:4000`) and default
  Nx development server (`BASE_URL=http://localhost:4200`):
  `bun nx run panel-e2e:e2e --args="--project=chromium --headed --grep=company"`.
  The test covers real Signal Forms keyboard search, server page requests, stale
  row removal, empty/denied/server-error states, diagnostic suppression, focused
  scroll region, 44px paging targets, and 375px/1280px RTL/LTR overflow checks.
  Authentication and company HTTP responses were controlled fixtures, not a live
  authorization/database acceptance test. Firefox/WebKit are not claimed.
- Fixed and regression-tested the expired-token read gate: an existing identity
  is allowed through the scoped HTTP refresh chain; anonymous sessions are denied.
- FND-06 remains partial (confirmed errors/paging/integers only). FND-09 through
  FND-14 await concrete mutation/form consumers and their stated contract gates;
  no empty lookup/upload/date/coordinate boundaries were generated. FND-16 and
  FND-17 remain open for the full shared-control set, beyond this verified table.

### 2026-11-09: Verified Real Company Forms and Shared Controls

- Added `LookupSelect`, `CoordinateFields`, and `ConfirmDialog` within existing
  `@org/ui-forms`, not projects per component. FieldTree-backed lookups preserve
  exact string/current IDs and disabled/readonly/touched behavior. Owner state
  cancels superseded province/city reads and clears dependent values. No global
  cache was added; session changes clear records, options and local drafts.
- Coordinates retain zero, use tested decimal/range adapters in the owning
  domain and support optional map intent without an SDK/key or geofence rule.
  No calendar, timezone, money or phone business validation was invented.
- Confirmation composes actual Helm/Brain title/description, focus trap/restore,
  Escape/cancel and busy behavior. Editor CanDeactivate protects dirty navigation
  and pristine in-flight saves; successful queued navigation waits for the known
  save result. Client cancellation is not claimed as server-write rollback.
- AOT caught NG8022 for combining FormField and disabled on one select. The
  adapter now bridges Helm value output to FieldTree with supported dirty/touched
  APIs and one disabled binding, not native-disabled DOM overrides. Focused ngc
  and panel AOT pass. Forms use novalidate so Signal Forms owns error feedback.
- Transport HTTP validates explicit alternative bases for version-neutral states
  without duplicating the scoped HttpClient chain. Tests prove token/tenant scope
  and no credential forwarding to unrelated origins.
- Tests: shared forms 25, transport HTTP 46, company data 44, company UI 8, table
  4, plus shell/landing and panel regressions. Public consumers vary mount/API/
  branding/labels, field locks, and create/edit state. AOT, lint/typecheck and
  unchanged budgets pass. Every future control must retain FND-15/16/17 checks.
- Headed Chrome: production company suite 3 passed; full production suite 14
  passed with 2 explicit environment-dependent BFF skips. Clean development
  company suite passed 3 on 4201: occupied 4200 returned an unrelated 404 and was
  not killed. Checks cover edit/create, keyboard submission, required/server
  feedback, parent reset, duplicate saves, full DTO/zero preservation, no implicit
  workspace switch, legacy redirect, unsaved cancel/Escape/discard, modal focus,
  and real 44px mobile fields/dialog controls in RTL/LTR layout.
- Fixtures are not live DB or approved membership policy. FND-10 is partial:
  generic/geography controls are delivered, but person/driver owning adapters
  await real consumers. FND-06/11/12/14 retain date/money, media and domain-policy
  gates. Unsupported logo removal and inline type creation are not exposed.
