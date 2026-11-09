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
[ ] FND-09 Generate reusable confirmation and page/action compositions where existing Helm/layout exports do not already cover the need.
[ ] FND-10 Generate reusable scoped company/person/driver and province/city lookup components with cancellation and dependent-selection reset.
[ ] FND-11 Generate reusable image/document controls with preview, MIME/size validation, replacement/removal contracts, and resource cleanup.
[ ] FND-12 Generate reusable date-only/Jalali display and time controls with tested calendar/timezone conversion, not silent UTC shifting.
[ ] FND-13 Generate reusable coordinate input with range validation and map-adapter hooks without embedding a provider key or imposing unapproved geofences.
[ ] FND-14 Extract shared phone/mobile/email/plate validation functions only after confirming their intended requirements; keep domain-specific validators within the owning library.
[X] FND-15 Register every new library in Nx/Sheriff and every consumed Helm source in Tailwind; repair metadata from actual imports rather than blanket exclusions.
[ ] FND-16 Test each public UI/utility API with more than one configuration or domain consumer, including pristine/disabled/touched Signal Forms behavior.
[ ] FND-17 Verify real table/forms/dialog behavior, RTL/LTR, mobile, hydration, keyboard interaction, and production bundle budgets in consuming apps.

## Evidence

Baseline: `CORE-THEME-TASKS.md` and the root migration plan record prior foundation
validation. Add new target names, consumer tests, backend decisions, and browser
results here as shared controls are delivered. Do not mark proposed controls done.

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
