# Company Management TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** legacy behavior analyzed; company CRUD is not migrated.

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
[ ] COMPANY-02 Generate and register the reusable library boundaries, public aliases, Nx tags, and Sheriff mappings.
[ ] COMPANY-03 Implement typed read/write adapters for company type, contact/address, city/province, logo, coordinates, and IDs.
[ ] COMPANY-04 Implement scoped search/list/detail state with URL-owned filters/pages and cancellation/stale-response handling.
[ ] COMPANY-05 Deliver the real TanStack v9/Spartan company table and jointly extract shared table primitives from this working consumer.
[ ] COMPANY-06 Implement explicit local Signal Forms for create/edit with agreed requirements and accurate server-field feedback.
[ ] COMPANY-07 Reuse shared geography, logo/document, phone, and coordinate controls; do not block numeric coordinate entry on map-provider approval.
[ ] COMPANY-08 Verify logo replacement/removal and flat-read versus nested-write coordinate round trips without losing valid zero values.
[ ] COMPANY-09 Implement confirmed update/delete semantics, confirmation, duplicate-save protection, and scoped invalidation after mutations.
[ ] COMPANY-10 Keep company editing distinct from authorized context selection; do not silently change current scope after every save.
[ ] COMPANY-11 Export configurable routes/providers/components and preserve or redirect established company URLs deliberately.
[ ] COMPANY-12 Test another consumer configuration with different mount paths and selection callbacks, without app imports.
[ ] COMPANY-13 Test invalid/denied/deleted companies, partial responses, backend errors, rapid searches, and context changes.
[ ] COMPANY-14 Verify complete CRUD and selection flows in zoneless RTL/LTR/mobile browsers with correct SSR policy and library/build checks.

## Evidence

Record contract decisions, fixtures versus live API acceptance, public consumer
tests, and the first login/company-selection acceptance milestone.
