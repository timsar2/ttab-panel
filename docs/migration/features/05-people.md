# People

[Main TODO](../TODO.md)

## Scope And Status

Partial migration: typed scoped data adapters and a library-owned search/selection page are fixture-verified. Detail UI, forms, profile-image editing and CRUD acceptance remain pending. Panel live reads remain explicitly gated pending approved Person access.
Legacy `users` presents Person fields, not role/password management. Its create API nevertheless provisions an Identity account and sends messages; it must not be enabled as a harmless directory write. Legacy behavior is not migrated completion.
Required reading and shared delivery rules are inherited from the main TODO; this file adds feature-specific acceptance gates.

## Mandatory Library Boundary

Implemented boundaries: `libs/transport/people/data-access` and `libs/panel/people`, with components in `src/lib/ui` inside the feature Nx library.
Generate new feature libraries with Bun/Nx; place every component in an appropriate existing/generated library, not `apps/panel`; one project per component is unnecessary.
Expose public typed configuration, scoped providers, and a lazy route factory; libraries must not import app configuration, environments, concrete routes, or app stores.
The app remains thin bootstrap/provider/routing composition; data-access stays independent of UI and navigation.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind, and Bun/Nx tooling.

## Dependencies

Shared prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [authentication](01-authentication.md), [company context](03-company-context-and-shell.md), and [companies](04-companies.md).
Consumers: [drivers](06-drivers.md), [passengers](15-passengers-and-bulk-assignment.md), and [release parity](22-release-and-parity.md).

## Contract And Business Gates

Domain references: C2, E2, F1 L10, G, J1 Q01-Q05; primary evidence S06 and S19 in BUSINESS_DOMAIN.md.
Q01/Q02 gate Person, Passenger, authenticated-identity mappings and company membership; do not equate IDs or tenant/company scope.
Q03-Q05 gate access, company-switch behavior, deletion cascades, retention, and audit; menu visibility is not authorization.
Mobile validation and optional national-ID/postal lengths are source observations, not proof of checksum or mandatory national ID.
Birthday is visible but unbound and absent from the write contract; do not capture or promise persistence without an agreed contract.

## Pending Tasks

[X] PEOPLE-01 Confirm actual search/detail/create/update/delete endpoints, verbs, envelopes, IDs, paging and field errors through read-only source/schema inspection; record contradictions without production calls.
[ ] PEOPLE-02 Resolve Q01-Q05 and the birthday gate with product/backend evidence; preserve source-matching types and document unresolved requirements without invented validation or identity rules.
[X] PEOPLE-03 Inspect existing libraries and generator help, dry-run then generate needed people libraries with Bun/Nx; keep person pages, forms and pickers inside appropriate libraries and export config/provider/route factories.
[X] PEOPLE-04 Register public aliases, Nx scope/type tags, explicit dependency edges and Sheriff path mappings; verify no app imports, deep imports or data-access-to-UI edges.
[ ] PEOPLE-05 Implement a route-scoped NgRx SignalStore for records/status/errors keyed by session, company, person ID, filters and paging; cancel stale reads and clear sensitive state on scope changes.
[ ] PEOPLE-06 Build standalone OnPush person forms with component-local signals and Signal Forms; map nullable/omitted fields explicitly and protect dirty drafts from reload effects.
[ ] PEOPLE-07 Reuse shared person-search, contact, geography and upload controls where available; expose typed selection/submit outputs and verify preserve/replace/remove profile-image payload semantics.
[X] PEOPLE-08 Compose a TanStack Table v9 and Spartan people list with supported server search/paging, URL-backed filters, truthful page selection and loading/empty/error states.
[ ] PEOPLE-09 Prove create-read-edit-read-delete roundtrips with controlled fixtures or approved non-production services; resolve unbound birthday, omitted search scope and image-edit contradictions instead of copying defects.
[ ] PEOPLE-10 Derive company context from authorized configuration, never hardcoded company IDs; test direct URLs, inaccessible records, logout, company switches and server denial without inventing login roles.
[ ] PEOPLE-11 Add required Tailwind sources for library/Helm classes and semantic logical styles; verify responsive RTL/LTR, keyboard focus, field errors, dialogs and image alternatives.
[X] PEOPLE-12 Verify the public feature in an alternate consumer with different mount paths, API configuration and destinations; ensure lazy routes and callbacks contain no panel assumptions.
[ ] PEOPLE-13 Add unit tests for DTO adapters, optional values, person-identity distinctions, scoped-store races, form validation, picture preservation and CRUD failures using zoneless TestBed/HTTP fixtures.
[ ] PEOPLE-14 Run discovered targets via Bun/Nx and browser/accessibility checks for CRUD, dirty-draft failures and scope switches; verify protected client rendering, SSR isolation, hydration policy and disabled private HTTP transfer caching.
[ ] PEOPLE-15 Record evidence and resolve release gates before marking any task complete; distinguish mocked tests from approved non-production API acceptance and retain unresolved birthday/identity/deletion decisions.

## Evidence

No live backend acceptance or production calls are claimed; legacy S06/S19 observations establish reference behavior only. Narrow completed infrastructure/search tasks do not complete Person management or grant permission to read Person records.

### 2026-11-10: Scoped Person Search and Panel-Owned Feature

- Reused the in-progress domain data library rather than recreating it. Its branded
  Person and company IDs remain distinct from Identity and Passenger IDs. Explicit
  company/access factories are mandatory; denied/unresolved access sends no HTTP.
- Fixed stale-company selection and late-error publication before Angular's scope
  effect flushes. Added session-version selection protection and mutation/page
  contract regressions. Data checks pass: 139 tests, lint, source and spec types.
- Inspected installed Nx library generator help/source, dry-ran and generated
  nonbuildable `libs/panel/people` with `scope:panel,type:feature`, alias
  `@org/panel-people`, explicit Sheriff mapping and Tailwind source. Removed the
  generated demo component/spec/README. `PeoplePage` lives under `src/lib/ui`;
  its explicit `@org/panel-people/ui` entry does not eagerly export UI at startup.
- Search composes the existing TanStack v9/Spartan DataTable, Signal Forms inputs
  and lookup. URL owns name/national-ID/shift-state/page/size; only supported server
  filters are sent, page indices adapt once, and no client-side whole-dataset
  filtering/sorting, cross-page selection or permission/boarding claim is invented.
  Remote profile images are not loaded automatically from production URLs.
- Component-owned search state cancels reads on company/session changes. Typed
  selection callbacks resolve only a current page row. Two consumers at `/people`
  and `/directory`, with different API prefixes, exercise real HTTP fixtures,
  filters/pages/callbacks, unsupported URL values, 403, cancellation and cleanup.
  Feature tests: 5 passing; source and spec typechecks and boundary lint pass.
- Panel mounts private client-rendered `/client/:companyId/people`, under the
  existing guarded company shell, with a navigation link. Scope is derived from
  committed route context, not storage or a hardcoded company. The app explicitly
  denies live reads until Q01-Q05 permissions are approved; source-backed fixtures
  demonstrate the reusable consumer without fabricating policy. No person create,
  update, delete, passwords/roles or birthday fields were exposed.
- `bun nx run-many -p panel-people,transport-people-data-access,panel,panel-e2e -t
lint,typecheck,test` passed 10 applicable targets, including 12 panel tests.
  Separate `bun x tsc -p libs/panel/people/tsconfig.spec.json --noEmit` passes.
  Production build passes without budget increases: under 500 kB initial and a
  separate lazy people-page chunk. jsdom still reports its existing unsupported
  icon CSS `@layer` parsing warning; actual browser checks show no runtime errors.
- Managed headed Chrome `panel-e2e:e2e` people check passed in production on 4307
  and development on 4308. It verifies explicit denial without any people HTTP,
  query editing, RTL/LTR at 375px, 44px controls, private reload HTML, logout and
  denied direct links. Full production suite passes 15, with 3 explicit real-BFF
  environment skips. Managed servers are torn down by the test runner.
- PEOPLE-05 remains open for person detail/editor workflow state; PEOPLE-06/07/09,
  10/11/13/14/15 retain their full form/media/CRUD, policy and live acceptance gates.
  Search fixture success is not authorization proof. Main M05 remains unchecked.

### 2026-11-10: Authoritative Person Transport Review

Read-only backend/controller/service/validator and legacy-source inspection, not
runtime or database acceptance. Backend paths below are relative to
`transport-backend/src`; legacy paths are under `panel/src/app`.

- The Person facade is `Host/Controllers/Identity/UsersController.cs`, version
  neutral: POST `/api/users/search`, GET `/api/users/{id}`, POST `/api/users`,
  PUT `/api/users` with body ID (not PUT /{id}), DELETE `/api/users/{id}`. Actual
  success is `{ code: '2000', massage, result }` despite advertised raw controller
  return types. Detail/create/update may return success/null; delete returns the
  effective ID. Validation, bare authorization and exception families differ.
- Search accepts explicit nullable company ID, fullName, nationalId, userShiftState
  (`All`/`HasShift`/`HasNotShift`) and positive one-based paging. The handler in
  `Core/Application/Identity/Users/SearchUsersRequest.cs` forwards those SQL inputs,
  not inherited advanced filters or server sorting. Empty out-of-range results
  can report zero total count because count comes from the first row.
- Business/Person IDs are int, Identity IDs are strings, and city IDs are nullable
  shorts. Public detail has nullable first/last/email/national/contact/address,
  city/province names, cityId, flat lat/lng and string profileImage. It has no
  companyId, public Identity userId, roles, password or birthday. Person, Identity,
  Passenger and assignment identifiers must not be coerced into one ID type.
- Create/update share company/contact/address/city/national/name/email, nested
  coordinate and upload fields. Only create accepts mobile; update copies stored
  mobile in `Infrastructure/Identity/UserService.CreateUpdate.cs:389-428`.
  Do not present editable mobile on edit. Full-object update is not PATCH: omitted
  nullable fields become null; SQL clearing/coalescing is not demonstrated.
- Active validators show name max 75, email validation/uniqueness and populated
  national/mobile uniqueness. The create mobile Unless/NotEmpty chain is not proof
  every blank is rejected. Legacy Iranian phone/ten-character ID/postal rules are
  observations, not approved global constraints. Birthday is unbound in legacy
  template, absent from read/write DTOs and must not be captured or promised.
- **Identity side effects:** create provisions an Identity account, assigns Basic,
  generates a password when absent, links business-entity identity and queues
  welcome SMS/conditional email (`UserService.CreateUpdate.cs:112-188`). Delete
  marks linked Identity deleted/inactive after the Person procedure. Product must
  explicitly approve these effects; do not expose passwords/role controls in the
  Person UI or treat deletion as removing company membership.
- **Authorization gates:** operator search/create/company writes substitute the
  company claim, but detail/update do not visibly verify target membership. Detail
  response cannot prove ownership because companyId is absent. Admin/Manager
  searches/writes accept arbitrary company input; SQL protections are unverified.
  Non-admin delete rewrites to self, including Manager/Operator: never mirror the
  legacy optimistic requested-row removal. Missing claims may become 0/null.
- Main legacy users list sends companyId; its shared autocomplete/reset omits it.
  New typed adapters must send configured scope explicitly, not repeat omission.
- Profile image null/omission preserves. Replacement stores a new path but the
  Person update path does not remove the old file. Delete-only removes the file
  while retaining its path; data plus delete also favors the broken delete path.
  Keep removal disabled until corrected. Storage requires image data URL and
  dotted `.jpg/.jpeg/.png/.webp`; Name defaults to private-set server GUID. Detail
  prepends a hardcoded production image base while search does not: never prepend
  again or make automatic production image requests. No remote preview is assumed.
- Procedures referenced are `Person.uspGetUserInfoList`, `uspGetUserInfoById`,
  `uspSetUserInfo`, `uspDelUserInfo`; readable definitions are unavailable. Backend/
  product owners retain Q01-Q05, company enforcement, account/message side effects,
  deletion/history/retention, optional-field clearing and birthday gates. Approved
  non-production denial/roundtrip evidence is still required before live exposure.

Safe next work is typed transport/adapters, separately branded IDs, scoped read
state and fixture consumers. That work must not be reported as backend ownership
proof, permission approval or accepted live CRUD. PEOPLE-02 and later tasks remain
open; no person mutation or live service was called by this review.
