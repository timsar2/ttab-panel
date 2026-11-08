# People

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: company-context person search, identity/contact/address details, profile image, and person CRUD.
Legacy `users` is a Person workflow, not account provisioning, passwords, or login-role assignment; legacy behavior is not migrated completion.
Required reading and shared delivery rules are inherited from the main TODO; this file adds feature-specific acceptance gates.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/people/data-access` and `libs/transport/people/feature`.
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

[ ] PEOPLE-01 Confirm actual search/detail/create/update/delete endpoints, verbs, envelopes, IDs, paging and field errors through read-only source/schema inspection; record contradictions without production calls.
[ ] PEOPLE-02 Resolve Q01-Q05 and the birthday gate with product/backend evidence; preserve source-matching types and document unresolved requirements without invented validation or identity rules.
[ ] PEOPLE-03 Inspect existing libraries and generator help, dry-run then generate needed people libraries with Bun/Nx; keep person pages, forms and pickers inside appropriate libraries and export config/provider/route factories.
[ ] PEOPLE-04 Register public aliases, Nx scope/type tags, explicit dependency edges and Sheriff path mappings; verify no app imports, deep imports or data-access-to-UI edges.
[ ] PEOPLE-05 Implement a route-scoped NgRx SignalStore for records/status/errors keyed by session, company, person ID, filters and paging; cancel stale reads and clear sensitive state on scope changes.
[ ] PEOPLE-06 Build standalone OnPush person forms with component-local signals and Signal Forms; map nullable/omitted fields explicitly and protect dirty drafts from reload effects.
[ ] PEOPLE-07 Reuse shared person-search, contact, geography and upload controls where available; expose typed selection/submit outputs and verify preserve/replace/remove profile-image payload semantics.
[ ] PEOPLE-08 Compose a TanStack Table v9 and Spartan people list with supported server search/paging, URL-backed filters, truthful page selection and loading/empty/error states.
[ ] PEOPLE-09 Prove create-read-edit-read-delete roundtrips with controlled fixtures or approved non-production services; resolve unbound birthday, omitted search scope and image-edit contradictions instead of copying defects.
[ ] PEOPLE-10 Derive company context from authorized configuration, never hardcoded company IDs; test direct URLs, inaccessible records, logout, company switches and server denial without inventing login roles.
[ ] PEOPLE-11 Add required Tailwind sources for library/Helm classes and semantic logical styles; verify responsive RTL/LTR, keyboard focus, field errors, dialogs and image alternatives.
[ ] PEOPLE-12 Verify the public feature in an alternate consumer with different mount paths, API configuration and destinations; ensure lazy routes and callbacks contain no panel assumptions.
[ ] PEOPLE-13 Add unit tests for DTO adapters, optional values, person-identity distinctions, scoped-store races, form validation, picture preservation and CRUD failures using zoneless TestBed/HTTP fixtures.
[ ] PEOPLE-14 Run discovered targets via Bun/Nx and browser/accessibility checks for CRUD, dirty-draft failures and scope switches; verify protected client rendering, SSR isolation, hydration policy and disabled private HTTP transfer caching.
[ ] PEOPLE-15 Record evidence and resolve release gates before marking any task complete; distinguish mocked tests from approved non-production API acceptance and retain unresolved birthday/identity/deletion decisions.

## Evidence Placeholder

Not completed. Implementation paths, contract decision references, Bun/Nx results, browser/accessibility results, alternate-consumer and client/SSR evidence: pending.
No live backend acceptance or production calls are claimed; legacy S06/S19 observations establish reference behavior only.
