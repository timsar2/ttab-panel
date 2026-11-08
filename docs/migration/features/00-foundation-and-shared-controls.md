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
[ ] FND-04 Confirm common transport API envelopes, error formats, page conventions, identifiers, and write/read DTO differences from authoritative contracts.
[ ] FND-05 Generate the needed reusable transport HTTP/data adapter library without duplicating auth's scoped client or leaking credentials to other origins.
[ ] FND-06 Implement reusable typed error, pagination, ID, date-only/time, numeric, and money adapters only where domain contracts agree.
[ ] FND-07 Build the first real company table and extract a typed TanStack v9/Spartan composition with columns, stable row IDs, actions, paging, and loading/empty/error states.
[ ] FND-08 Define local versus server filtering/sorting and cross-page selection explicitly; never treat one server page as the full dataset.
[ ] FND-09 Generate reusable confirmation and page/action compositions where existing Helm/layout exports do not already cover the need.
[ ] FND-10 Generate reusable scoped company/person/driver and province/city lookup components with cancellation and dependent-selection reset.
[ ] FND-11 Generate reusable image/document controls with preview, MIME/size validation, replacement/removal contracts, and resource cleanup.
[ ] FND-12 Generate reusable date-only/Jalali display and time controls with tested calendar/timezone conversion, not silent UTC shifting.
[ ] FND-13 Generate reusable coordinate input with range validation and map-adapter hooks without embedding a provider key or imposing unapproved geofences.
[ ] FND-14 Extract shared phone/mobile/email/plate validation functions only after confirming their intended requirements; keep domain-specific validators within the owning library.
[ ] FND-15 Register every new library in Nx/Sheriff and every consumed Helm source in Tailwind; repair metadata from actual imports rather than blanket exclusions.
[ ] FND-16 Test each public UI/utility API with more than one configuration or domain consumer, including pristine/disabled/touched Signal Forms behavior.
[ ] FND-17 Verify real table/forms/dialog behavior, RTL/LTR, mobile, hydration, keyboard interaction, and production bundle budgets in consuming apps.

## Evidence

Baseline: `CORE-THEME-TASKS.md` and the root migration plan record prior foundation
validation. Add new target names, consumer tests, backend decisions, and browser
results here as shared controls are delivered. Do not mark proposed controls done.
