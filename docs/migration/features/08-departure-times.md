# 08. Departure Times

[MainTODO](../TODO.md)

## Status And Scope

Status: PARTIAL DATA AND PANEL UI (2026-11-10); source-backed data and configurable lazy list/create/edit pages are fixture-verified. Panel live access remains explicitly denied pending approved company/entity permissions. Deletion, live acceptance and full editable-browser acceptance remain pending.
LEGACY/CONTRACT: S12 exposes company, name, and `shiftTime` for named travel clock slots.
ShiftTime is not a work Shift and is not the Route's first-station `departureTime`.
TASK: migrate company-scoped maintenance and reusable lookups, not calendar generation or dispatch.

## Proposed Library Boundary

Implemented data boundary: Bun/Nx-generated `libs/transport/departure-times/data-access`, public alias `@org/transport-departure-times-data-access`, tags `scope:transport,type:data`.
Panel feature/components live in generated `libs/panel/departure-times`, with components under `src/lib/ui`. Its public route/provider entry and explicit `/ui` entry preserve lazy ownership. The earlier data-only slice did not create UI; the subsequent UI evidence below records the consumer integration.
Data-access owns DTOs, time/error adapters, API services, helpers, and route-scoped NgRx SignalStore state.
Feature owns all pages, standalone OnPush components, Signal Forms drafts, and a public route factory/configuration.
Use signals, TanStack Table v9, Spartan, and public aliases; no application imports or one Nx project per class.
Apps supply mount paths, authorized context, and configuration only; enforce Nx tags and Sheriff edges.

## Dependencies

Shared [controls](00-foundation-and-shared-controls.md), [access](01-authentication.md), and [company context](03-company-context-and-shell.md).
Consumers: [shifts](09-shift-groups-and-shifts.md), [routes](10-routes.md), and [lines](12-lines.md).

## Domain Gates

Q03-Q04 gate permissions and company URL behavior; Q13 gates clock/calendar/timezone conversion.
Q14 gates precedence between Route, Line, Shift, and displayed start/end times; do not infer equivalence.
Resolve these independently; confirmed slot CRUD need not wait for an executable schedule calendar.

## Pending Tasks

[ ] TIME-01 Confirm endpoint spelling, HTTP verbs, envelopes, lookup/detail IDs, paging, deletion references, and field-error contracts against the authoritative API.
[ ] TIME-02 Define typed read/write/search DTOs and pure clock/date/error adapters; distinguish clock strings from date instants and verify timezone-free round trips.
[X] TIME-03 Reuse or Bun/Nx-generate the scheduling libraries after generator discovery/dry-run; register public aliases, Nx tags, and Sheriff ownership without app-owned feature code.
[ ] TIME-04 Export configurable lazy departure-time routes and lookup APIs with caller-supplied mount paths, endpoints, company context, and forbidden destinations.
[X] TIME-05 Provide route-scoped NgRx SignalStore records, loading/save/error state, computed lookup options, and targeted invalidation after successful mutations.
[X] TIME-06 Bind supported search, page, and sort filters to typed URL state and adapt TanStack Table v9 pagination to the confirmed server convention.
[X] TIME-07 Cancel superseded reads and reject stale session/company/filter responses; clear sensitive records and selections on company switches and logout.
[X] TIME-08 Implement explicit local Signal Forms drafts for company, name, and clock value with confirmed defaults and deliberate empty/omitted payload mapping.
[X] TIME-09 Hydrate edit drafts once per record identity, retain user edits during refresh, preserve drafts on failure, and prevent duplicate saves.
[ ] TIME-10 Render accessible loading, empty, unavailable-reference, not-found, retry, field-error, and save-error states with invalid feedback only after blur/submission.
[ ] TIME-11 Reuse shared forms, clock controls, table, and Spartan dialogs; inspect installed CDK APIs including writable Directionality.valueSignal and verify keyboard behavior.
[ ] TIME-12 Implement confirmed create/read/update/delete flows with destructive confirmation and backend reference-conflict display rather than silently breaking Line or Shift references.
[X] TIME-13 Publish scoped lookup contracts for Lines and Shifts without inventing precedence over Route departureTime or any work-day resolution policy under Q14.
[ ] TIME-14 Apply agreed role gates and require backend company/entity authorization for every read/write; a management menu or selected company is not access proof.
[ ] TIME-15 Unit-test DTO/time/error adapters, validators, store races, reference conflicts, and company changes using controlled API fixtures.
[X] TIME-16 Test the public route factory and lookup API in an alternate consumer and different mount path with isolated providers and no imports from apps.
[ ] TIME-17 Browser-test CRUD, failures, keyboard overlays, RTL/LTR, mobile, and production rendering; verify protected SSR policy, no private transfer cache, and hydration safety if rendered.
[ ] TIME-18 Run discovered affected Bun/Nx test/lint/typecheck/build targets and record dated mocked versus live-backend evidence before any completion mark.

## Verified Data Slice

[X] TIME-UI-01 Generate a panel-owned departure-time feature with truly lazy list/editor routes, public configuration and matching Nx/Sheriff boundaries.
[X] TIME-UI-02 Implement URL-owned bounded name search and explicit local Signal Forms for create/edit, exact time hydration, field errors, duplicate-save protection and dirty navigation.
[X] TIME-UI-03 Verify alternate consumer routes, scope/session cancellation, inaccessible records, private rendering and production/development browser behavior without claiming live policy approval.

[X] TIME-DATA-01 Generate only the departure-time data library after plugin discovery, generator help/source inspection and dry-run; expose its public alias and data tags without app imports or generated UI placeholders.
[X] TIME-DATA-02 Implement source-shaped read/write/list DTOs, positive short IDs, exact bounded .NET TimeSpan parsing, explicit minute input and model-state/error adapters with unit fixtures.
[X] TIME-DATA-03 Implement configurable list/detail/create/update APIs requiring explicit company and access factories; deny unresolved access, check response identity/company, suppress private transfer caching and avoid unsupported PUT/delete or automatic mutation retries.
[X] TIME-DATA-04 Implement consuming-route-provided NgRx lookup/save state with superseded-read cancellation, company/session stale result/error checks, synchronous scoped public projections, duplicate-save prevention and scoped list invalidation after accepted upsert responses.
[X] TIME-DATA-05 Pass uncached library test/lint/typecheck targets and separate spec typechecking, including alternate-injector API configuration, controlled HTTP errors and scope/session races; record mocked-only limits below.

## Source Evidence

Inspected on 2026-11-10. Paths below are relative to the enclosing `ttab` directory; these are source contracts, not live endpoint acceptance.

- `transport-backend/src/Host/Controllers/VersionedApiController.cs:3` defines `api/v{version:apiVersion}/[controller]`; `Company/Shifts/ShiftTimesController.cs:8-46` confirms GET `{id}`, POST collection, POST `set-shift-time`, and a declared DELETE `{id}`. The legacy service confirms `/v1/shiftTimes` spelling. The new API requires caller-supplied API base and relative collection/save endpoints rather than embedding deployment URLs.
- `transport-backend/src/Host/Controllers/BaseApiController.cs:24-49` confirms the `code`/`massage`/`result` envelope and success code `2000`. Null detail/upsert rereads remain null, not invented records. A null upsert reread is exposed as `saveOutcome: 'unconfirmed'`, not confirmed success.
- `transport-backend/src/Core/Application/Companys/Shifts/ShiftTimes/GetShiftTimeListRequest.cs:5-23` confirms only `CompanyId` and nullable `Name`; the handler fixes SQL `PageSize` to 1000 and returns an array, not a paginated result. Controller line 21 may replace the submitted company with the authenticated claim. Cross-company results are rejected, not silently adopted.
- `ShiftTimeDto.cs:2-6`, `SetShiftTimeRequest.cs:6-25`, `GetShiftTimeRequest.cs:5-25`, and `Domain/Company/ServiceShiftTime.cs:3-7` confirm short record/company IDs, string name, read/domain TimeSpan, string write time and nullable create ID. The GET parameter is short even though its mediator request accepts int; public IDs use positive short range.
- `SetShiftTimeValidator.cs:5-14` establishes only nonempty company/name/time validation. `Infrastructure/Middleware/AsyncValidationFilter.cs:24-33` adds validator property names to MVC ModelState. Existing shared transport error decoding is reused; this library maps known PascalCase fields to `id`/`companyId`/`name`/`shiftTime`, preserving unknown fields and backend codes without inventing a reference-conflict code.
- `transport-backend/src/Host/Program.cs:27-34` uses System.Text.Json controller serialization with no custom TimeSpan converter in the inspected setup. Exact constant TimeSpan text is parsed without Date, offsets or calendar conversion, including fractional ticks/sign/days and Int64 range. Deliberate `HH:mm` entry becomes `HH:mm:00`; full TimeSpan text is preserved. `departureClock` returns null for signed/day-bearing values rather than silently wrapping or assigning a work date. Accepting the wire representation does not approve a scheduling meaning for these values.
- `transport-backend/src/Core/Domain/Company/Line.cs:12-13` and `Shift.cs:7-8` reference entrance/return shift-time IDs. `DelShiftTimeRequest.cs:18-23` delegates to a stored procedure; controller DELETE accepts a complex request without explicit route binding. Neither reference-conflict semantics nor actual route model binding was established. The new API deliberately has no delete method.
- `panel/src/app/pages/shift-time/data-access/api/shift-time.service.ts:13-33`, `models/shift-times.model.ts:1-6`, and `ui/shift-time-form/shift-time-form.component.ts:34-66` confirm legacy company/name/time usage and POST upsert. The legacy helper's PUT path has no matching controller action and was not copied. Its current-local-time default and shared mutable selected company are not new domain rules.

## Implementation Evidence

- `src/lib/departure-time.models.ts` owns branded IDs/TimeSpan, typed DTOs/search/write body, bounded list decoding, explicit clock/input and field-error adapters. List results expose `limit: 1000`, `atLimit`, and `completeness: 'unknown'`; they do not expose a fabricated total count, page, full-dataset sort or select-all contract. Null list results become empty items without claiming completeness.
- `src/lib/departure-times-api.ts` exports `provideDepartureTimesData` and `DepartureTimesApi`. Consumers must supply endpoint paths, a nullable company Signal factory, and an observable access-decision factory. Access requests identify list/detail/create/update, company, and target ID when present. There is no default role matrix, inferred membership, navigation path or auth interceptor duplication. The consumer's existing scoped HttpClient/SessionStore is reused.
- Authorization and HTTP subscriptions are canceled on scope/session changes, caller unsubscribe and injector destruction; final success/error checks reject stale completions before Angular scope effects flush. Cancellation cannot roll back an already accepted server write. There are no automatic mutation retries.
- `src/lib/departure-times.store.ts` exports a non-root NgRx store for explicit consuming-route/workflow provision. Public list/query/lookup/loading/save/error projections synchronously hide mismatched company/session state; cleanup unsubscribes and clears retained scoped state. Filter reads replace earlier reads. Saves reject duplicates, leave caller-owned drafts untouched on failure, and invalidate only this store's scoped list after a successful envelope, including an unconfirmed null reread. No global schedule cache or UI selection policy was introduced.
- Generator-created component/spec/template/style and README placeholders were removed; there are no components, feature routes, app configuration edits or production HTTP calls. Only the new library, this checklist, and the generator's shared alias update belong to this slice. Existing dirty work was preserved.
- Root was notified on the shared board before shared generator changes and after completion. Root owns Sheriff/integration configuration: source module `libs/transport/departure-times/data-access/src`, data classification and allowed public data edges to auth data-access and transport HTTP. Library lint passed against the current root-owned mappings; this worker did not edit shared Sheriff/ESLint/app config.

## Generator And Verification

All commands ran from `front` using Bun, with no production requests or writes.

1. `bun nx list @nx/angular` and `bun nx g @nx/angular:library --help` discovered the installed generator/options.
2. Read `node_modules/@nx/angular/generators.json`, `dist/src/generators/library/library.js` and `lib/update-tsconfig-files.js` to inspect source, initialization and shared alias effects.
3. Ran `bun nx g @nx/angular:library libs/transport/departure-times/data-access --name=transport-departure-times-data-access --importPath=@org/transport-departure-times-data-access --tags=scope:transport,type:data --buildable=false --publishable=false --skipModule --unitTestRunner=vitest-analog --linter=eslint --skipPackageJson --skipFormat --no-interactive --dry-run`, then the same command without `--dry-run`. Dry-run showed only new-library files and `tsconfig.base.json`; actual generation preserved existing concurrent aliases. No dependency/lockfile edits were needed.
4. `bun nx show project transport-departure-times-data-access --json` discovered inferred `test`, `lint`, `typecheck`, `build-deps` and `watch-deps`. This internal source-consumed library is nonbuildable and has no independent production build target. The Analog plugin uses an explicit absolute spec tsconfig.
5. `bun nx run-many -t test lint typecheck -p transport-departure-times-data-access --skipNxCache --output-style=static`: PASS on 2026-11-10, 63 tests in two files; lint and source typecheck passed with zero warnings. Fixtures cover precise time round trips/range, invalid IDs/wire values, allowlisted payloads, malformed/business envelopes, duplicate/cross-company/bounded lists, null responses, field/conflict errors, authorization denial, delayed decisions, request cancellation, superseded filters, company/session transitions, stale pre-effect responses/errors, duplicate saves, failure/draft preservation, scoped invalidation and an isolated alternate consumer API prefix/endpoints/company/access policy.
6. `bun x tsc -p libs/transport/departure-times/data-access/tsconfig.spec.json --noEmit`: PASS, separately verifies test/public API types.
7. `bun x prettier --write "libs/transport/departure-times/data-access/**/*.{ts,mts,mjs,json}"` formatted only the new library; the complete verification commands above were rerun afterward. `git diff --check -- docs/migration/features/08-departure-times.md libs/transport/departure-times/data-access tsconfig.base.json` passed (Git emitted only its workspace line-ending notices).

## Unresolved Gates

- Q03/Q04: Approved company/entity access policy, direct URL behavior and backend authorization remain owner decisions. A configured frontend predicate is not server authorization; no live enablement is implied. This library cannot establish membership from menu visibility or a selected company. Backend/business owners still need to be assigned for approval.
- Q13/Q14: No timezone, Jalali/Gregorian, calendar, night-shift, slot precedence or Route/Line/Shift equivalence policy was decided. The library preserves source time representation only; no date-to-clock conversion, schedule generation or guessed current-time defaults exist. Decision owners/dates remain pending beyond this 2026-11-10 source audit.
- TIME-01/TIME-12: Delete route binding, stored-procedure behavior, retention/cascades and Line/Shift reference-conflict payloads require backend evidence/approved policy before a delete API or destructive UI can ship. Generic observed error envelopes are decoded, not a fabricated deletion policy.
- Server paging/total count is absent. The library intentionally cannot claim an exhaustive lookup; large-company lookup behavior and an authorized paginated backend contract remain open. Name filtering is sent to the supported request field, not promoted into an unsupported full-dataset client search.
- Read/write TimeSpan transport is source-backed and fixture-tested, not live-verified; actual deployed serialization, database mapping, successful upsert rereads and target-company authorization remain staging acceptance work.
- No feature UI, route factory, application mount, browser/RTL/mobile/overlay acceptance, consumer production build or live backend validation ran in this data-only slice. Alternate DI/HTTP configuration tests are not a substitute for future route/consumer/SSR acceptance. Any future private rendering must retain the application's explicit auth and no-private-transfer-cache policy.
- Unresolved original TIME tasks and migration main M08 remain open for their remaining feature/policy acceptance; verified DATA/UI tasks do not mark the entire departure-time feature complete.

## Panel UI and Independent Editor State (2026-11-10)

- Generated `libs/panel/departure-times` after the previously inspected installed
  Nx generator help/source and a new dry-run. Removed generated demo files and
  README. Registered `scope:panel,type:feature`, Sheriff, public route/provider
  alias and separate `@org/panel-departure-times/ui`; all components are in the
  library's `src/lib/ui` folder. No implementation was added under the app.
- `createDepartureTimeRoutes` accepts caller-owned API/endpoints, reactive company,
  operation access and UI-management affordances. It lazily mounts list, `new` and
  `:id/edit` children with accessible error states and dirty navigation. Two
  consumers use `/slots` and `/travel-clock` with distinct API bases. No mount,
  tenant/company ID, role matrix or deployment URL is hardcoded in the library.
- List search sends only the supported name/company payload and owns the name in
  the URL. Shared TanStack/Spartan DataTable gained tested optional pagination
  visibility; the bounded consumer hides all page/count claims, retains actual
  rows and displays the 1,000-record/unknown-completeness warning. No local
  full-dataset filtering, sorting or select-all was introduced. TIME-06 is complete
  only for the confirmed unpaged API, not a claim that backend paging was added.
- Extended the route-provided domain store with independent `loadDetail`,
  `clearDetail`, `detailStatus`, `detailError` and `saveError`. Read/list/save
  lifecycles do not pollute one another; a list reload cannot erase a save error.
  Detail values hide synchronously outside their captured company/session and
  mismatched IDs cannot hydrate another editor. Data verification now passes 88
  tests, including 25 added detail/save-independence regressions.
- Signal Forms hold local name/time drafts, with empty defaults rather than a
  guessed current time. Company is a read-only authorized scope input, never an
  editable field. Name is nonblank; minute input maps explicitly to seconds, while
  exact stored seconds/fraction/sign/day values are preserved without Date,
  timezone conversion or a newly approved scheduling interpretation.
- Hydration occurs once per identity; detail refresh/save does not overwrite an
  edited draft. Errors stay linked only to unchanged submitted values. Successful
  create navigates to the confirmed edit ID, failed saves retain drafts, duplicate
  saves are blocked and a success/null reread disables resubmission rather than
  risking duplicate creation. Unconfirmed users must verify the list first.
- Existing shared confirmation handles keep/discard; route tests also cover dirty
  parameter changes in a reused editor. Browser acceptance found that logout can
  destroy the protected outlet before deactivation; the leave guard now accepts
  a null component. Both the null guard and actual protected-editor logout have
  regressions. Context loss clears drafts, pending reads and saved/error state.
- Panel mounts `/client/:companyId/departure-times`, `/new` and `/:id/edit` under
  private client rendering. Deliberate app-owned redirects preserve legacy
  `/shift-time`, `/shift-time/add` and `/shift-time/detail/:id`. Live list/editor
  access remains denied pending Q03/Q04; the page states this truthfully and
  sends no departure-time HTTP. This is not a frontend substitute for backend
  authorization, and no destructive delete operation is exposed.
- `bun nx run-many -p panel-departure-times,transport-departure-times-data-access,transport-support-data-access,shared-ui-data-table,panel,panel-e2e -t test,lint,typecheck`
  passes 16 applicable targets. Departure feature has 9 route/editor tests,
  departure data 88, shared table 5, support data 104, panel 12. Separate feature
  spec typecheck passes. Production panel build passes with unchanged budgets
  and separate lazy list/editor chunks. Existing jsdom icon-CSS parsing warnings
  do not occur as browser runtime errors.
- Managed headed Chrome production suite on 4307 passes 16 with 3 explicitly
  environment-dependent real-BFF skips. Managed development departure check on
  4308 passes. The browser verifies legacy redirects, private reload HTML, explicit
  denied editor/list access, no unauthorized HTTP, truthful missing pagination,
  RTL/LTR mobile overflow/44px controls, logout and denied direct URLs. Managed
  servers are torn down after checks.
- Enabled create/edit/search round trips are controlled TestBed/HTTP fixtures;
  they are not live-backend or editable-form browser acceptance. TIME-01/02/04,
  10/11/12/14/15/17/18 retain remaining deletion, policy, full accessibility and
  acceptance scope. Main M08 remains unchecked. No production requests or writes
  were made.
