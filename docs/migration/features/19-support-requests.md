# Support Requests TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** source-backed read-only data foundation verified with mocks; no migrated panel UI or live acceptance.
These records are support tickets, not ride bookings or dispatch assignments.

## Library Ownership and Dependencies

Generate reusable transport support data-access/feature libraries, with public
route factories and explicit forms/views. Reuse [shared tables](00-foundation-and-shared-controls.md),
[auth](01-authentication.md), [company context](03-company-context-and-shell.md),
and [notification transport](18-realtime-tracking.md) when delivered.

## Tasks

[ ] SUPPORT-01 Confirm support search/detail/delete contracts, applicant-type IDs, authorized visibility, and retention policy against Q05/Q26.
[ ] SUPPORT-02 Generate library-owned API/state/feature/component boundaries and register public aliases, Nx tags, and Sheriff mappings.
[ ] SUPPORT-03 Implement typed applicant/person/contact/date/subject/description adapters without confusing support with booking.
[ ] SUPPORT-04 Implement scoped search/list/paging/detail state and accurate counts without legacy detail-load list pollution or unscoped background searches.
[ ] SUPPORT-05 Implement reusable TanStack/Spartan list and readable details with correct request-ID navigation, loading/empty/error/access-denied states.
[ ] SUPPORT-06 Implement approved deletion confirmation and state invalidation without guessing cascades or exposing another company's records.
[ ] SUPPORT-07 Decide intended navigation visibility and make notification actions link to the actual authorized request route.
[ ] SUPPORT-08 Add deduplicated realtime request updates only when the shared notification lifecycle exists, respecting current filters and page totals.
[ ] SUPPORT-09 Resolve whether panel creation is required before enabling the dormant create wrapper; gate any creation form behind an approved contract.
[ ] SUPPORT-10 Do not invent approval, response, status, priority, resolution, SLA, or assignment workflows without separate product/backend scope.
[ ] SUPPORT-11 Test alternate consumers/mount paths, correct request-ID handling, unauthorized records, deletion failures, and repeated notification delivery.
[ ] SUPPORT-12 Verify library/store tests, RTL/mobile keyboard flows, private rendering/cache policy, and browser list/detail/delete acceptance.

## Evidence

## Read-Only Data Foundation (2026-11-10)

[X] SUPPORT-DATA-01 Generate `libs/transport/support/data-access` with a public alias and transport/data tags; root owns Sheriff mappings and permitted auth/http edges.
[X] SUPPORT-DATA-02 Implement source-backed typed search/page/sort and detail/case-file adapters, preserving opaque request dates and numeric support types without legacy applicant/description inventions.
[X] SUPPORT-DATA-03 Require configured endpoints, authenticated session, explicit selected company and consumer access policy; verify returned company, support type, requested ID and optional person scope.
[X] SUPPORT-DATA-04 Implement route/workflow-scoped SignalStore search and detail state, cancellation, stale session/company suppression and synchronous sensitive-data hiding, without global cache or detail-to-list pollution.
[X] SUPPORT-DATA-05 Verify mocked alternate-consumer API/store/adapter tests, lint, library typecheck and separate spec typecheck; record source limits and unresolved live/UI policy gates.

Only search and detail reads are in this slice. Create/delete/messages/resolution,
realtime and UI are excluded. New panel-specific support UI belongs under
`libs/panel/support`, not this transport data library. Original SUPPORT tasks stay
open until their full contract and consumer/browser acceptance are verified.

Record request lifecycle decisions, source-backed scope, permissions, navigation
tests, and fixture versus live API results. A dormant wrapper is not a completed
panel workflow.

### Backend Source Contract

Sources below are sibling `transport-backend` paths, inspected 2026-11-10;
these are source evidence, not deployed-backend acceptance.

- `src/Host/Controllers/VersionedApiController.cs:3` and
  `Controllers/Supports/SupportsController.cs:14-15,88-119` establish singular
  `api/v{version}/Support`, GET `{id:int}` and POST `search`. Configuration must
  supply the API prefix and endpoint paths; there is no production fallback.
- `SupportsController.cs:197-205` requires an authenticated identity, positive
  integer SID/person claim and positive short company claim even for global staff.
  `ClaimsPrincipalExtensions.cs:44-54` checks actual role claims. Admin/Manager
  are global staff; Oprator may access its company; other identities may access
  only their own person in their company. These checks are server rules, not a
  frontend role matrix inferred from menu visibility or the public Identity ID.
- `SupportsController.cs:110-117` overwrites search company for non-global users
  and person for non-Oprator users. The selected-company API always sends company
  scope and rejects returned rows from another company rather than displaying a
  rewritten search silently. A consumer-supplied access adapter must verify
  approved selected-company/entity access and claim mapping before requests.
- `SupportsController.cs:90-99` loads the requested support ID and returns 404 for
  both absent and unauthorized records through `CanAccess`. The client checks the
  returned support ID and company independently; a selected company is not proof
  of membership. Do not infer existence from a 404 or use the support's person ID
  as the detail navigation ID.
- `src/Core/Application/Supports/SearchSupportsRequest.cs:3-38,47-65` supports
  `supportTypeId` (required positive byte, no all-types default), optional company,
  person, fullName (maximum 100 characters), isAnswered, pageNumber 1..32767 and
  pageSize 1..100. Only one of Id/Subject/RequestDate with ASC-by-omission or DESC
  is accepted. No generic keyword, subject search, date range, status, priority or
  arbitrary multisort contract is inferred. Default order is RequestDate DESC,
  Id DESC; backend adds stable ID ties for Subject/RequestDate.
- `SupportDto.cs:3-13`, `SupportDetailsDto.cs:3-30` and
  `GetSupportRequest.cs:22-53` expose supportTypeId/name, company/person IDs,
  mobileNumber, requestDate, subject and isAnswered. Only list exposes fullName;
  detail exposes nested caseFile/person/trip/caseViolations. The backend detail
  does not expose legacy applicantTypeId/name, requestSubject or requestDesc/body.
  Case-file text is data, not HTML; UI must render it safely without inventing
  reply/resolution controls. Numeric support/violation IDs remain server values,
  not hardcoded driver/passenger applicant enums.
- `src/Core/Application/Common/Models/PaginationResponse.cs:5-33` establishes
  list/pagination metadata and one-based pages. Search count comes from the first
  SQL row (`SearchSupportsRequest.cs:65`), so an empty out-of-range page returns
  totalCount=0, not proof that the entire dataset is empty. The client preserves
  this source behavior, validates metadata/duplicates/scope and never fabricates
  cross-page totals or appends a detail record to search results.
- `tests/Infrastructure.Test/Persistence/SupportContractTests.cs:77-107,134-153`
  corroborates search bounds/stable SQL ordering and nested case-file mapping;
  it is not executed or claimed as frontend/live verification in this slice.

### Legacy Discrepancies Not Ported

Sibling `panel/src/app/pages/requests` sources establish an older, incompatible
view, not the authoritative current wire DTO:

- `data-access/models/request.model.ts:1-15` invents applicant labels and uses
  requestSubject/requestDesc instead of actual supportType/subject/caseFile fields.
- `data-access/api/request.service.ts:15-26` uses singular support paths but omits
  the now-required supportTypeId and supported sort/answer filters.
- `data-access/store/request.store.ts:48-50,74-79,114-124` appends notification and
  detail records to the current list without filter/page/scope/count reconciliation.
  The new data slice has no notification subscription or implicit background read.
- `feature/requests-list/requests-list.component.ts:19,35-38,54-55` constructs an
  absolute detail link and searches immediately from mutable optional company state.
  `feature/request-detail/request-detail.component.ts:15-18` passes string route
  IDs without typed validation; the new API accepts validated numeric support IDs.
  Navigation and route parsing belong to a future `libs/panel/support` consumer.

### Remaining Gates

- Q05/Q26: product/backend owners must approve support visibility, applicant/type
  labels, retention, deletion and navigation policy. Explicit read-access adapter
  configuration is mandatory; this library supplies no permissive default.
- Confirm deployed schema/serialization and database company/person filtering with
  approved fixtures/staging. Inspected controller authorization is not evidence
  that every deployment has the same implementation.
- Request dates are preserved as opaque nonempty server DateTime strings. No
  timezone, calendar, formatting, date-only or range policy has been invented.
- No create/delete/message/violation-lookup/realtime/resolution API is exposed.
  Source presence of these endpoints does not authorize implementing their workflow.
- No panel route/UI, SSR mount, navigation, browser accessibility/mobile/RTL,
  consumer build or live request acceptance is claimed by the data-only slice.

### Public API and Verification

`@org/transport-support-data-access` exports:

- `provideSupportData({ apiUrl, endpoints: { collection, search }, company, access })`.
  Both factories run in the consumer injector. The company factory supplies a
  `Signal<SupportCompanyId | null>`; the access factory supplies an observable
  decision callback for company-scoped search or a requested support ID. All
  endpoints and policy are explicit. Source-compatible paths are `v1/support`
  and `v1/support/search` when the supplied API base already ends in `/api`.
- `SupportApi.search(query)` and `SupportApi.detail(supportId)` only. All HTTP
  flows through the consumer's existing scoped/authenticated client. No interceptor
  or alternate client is registered by this library; transfer cache is disabled.
- `SupportStore` (provide per route/workflow, never root) with `load`, `loadDetail`,
  `clear`, and public scoped `page`, `query`, `detail`, `detailId`, `searchStatus`,
  `detailStatus`, `searchError`, `detailError` signals. Search/detail requests are
  independently superseded. Detail reads do not insert into list state or totals.
  All public data/error projections hide synchronously outside captured scope;
  company/session transitions cancel reads and clear state. Missing/unresolved
  scope exposes no data. Empty approved results use ready plus an empty page;
  absent/unauthorized details preserve backend 404 ambiguity as not-found.
- Typed read/config/access/search/status contracts and pure `supportId`,
  `supportCompanyId`, `supportSearchRequest`, `decodeSupportRow`,
  `decodeSupportDetail`, `decodeSupportPage` adapters. Search uses zero-based UI
  pageIndex and explicitly converts it to one-based backend pageNumber.

Generation used Bun/Nx `@nx/angular:library`, with installed generator help and
source (`library.js`, normalization, tsconfig updates and Analog configuration)
inspected first and a dry-run confirming file placement/source preservation.
The actual nonbuildable Vitest-Analog library has `scope:transport,type:data` tags.
Generated placeholder UI/tests/README were removed; real tests were retained.
Analog uses an absolute `tsconfig.spec.json`. Only the generated support alias in
`tsconfig.base.json` was changed outside owned library/checklist files; root owns
Sheriff/eslint/app/UI composition and was notified when generation finished.

Mocked verification on 2026-11-10:

- `bun nx run-many -t test lint typecheck -p transport-support-data-access --skipNxCache --output-style=static`: 104 tests across two files, lint and library source typecheck passed.
- `bun x tsc -p libs/transport/support/data-access/tsconfig.spec.json --noEmit`: passed, including public-barrel consumer imports and Analog config. The separate check caught and corrected a fixture helper's erased generic result type that runtime tests alone did not detect.
- Tests cover malformed IDs/DTOs/nested case files, byte and short bounds, all six supported sort values, unsupported query rejection, paging/filter/company/duplicate consistency, and the empty out-of-range count limitation.
- API/store tests cover false/nonboolean/empty/throwing policies, no session/company, query snapshots before async authorization, detail ID/company mismatches, 401/403/404/422/500 and business failures without retries, alternate endpoint/injector/scoped-client use, private transfer-cache options, superseded reads, destruction, pending-policy cancellation, and stale success/error responses before company effects/session events flush.
- Store tests verify independent list/detail state and totals, loading/ready-empty/denied/error/not-found states, synchronous hiding on company/session changes, and logout cleanup. All HTTP uses `HttpTestingController`; no live backend requests, writes, credentials, browser storage or sensitive global cache were introduced.
- `git diff --check -- docs/migration/features/19-support-requests.md libs/transport/support/data-access tsconfig.base.json`: passed. This nonbuildable data library has no independent production-build target; consumer build/browser/live acceptance remains deliberately unclaimed.
