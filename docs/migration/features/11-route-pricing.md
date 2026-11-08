# Route Pricing

[Main TODO](../TODO.md)

## Scope And Status

Pending migration: Route-owned effective-date price and absence-penalty configuration with correct detail loading and edit roundtrips.
Legacy controls do not establish migrated completion, fare calculation, billing, attendance, notice processing or penalty collection.
Required reading and shared delivery rules are inherited from the main TODO; do not promote captured amounts into an approved charging policy.

## Mandatory Library Boundary

Proposed reusable boundaries: `libs/transport/route-pricing/data-access` and `libs/transport/route-pricing/feature`.
Generate needed libraries with Bun/Nx; pricing forms, history/list and step containers live in appropriate existing/generated libraries, not `apps/panel`.
Expose public typed config, scoped providers and lazy route/embedding factories accepting Route context; no app imports, fixed paths or app stores.
Keep app changes thin bootstrap/provider/routing composition and data-access independent of presentation; components may share the pricing feature library.
Use only the prescribed stack: standalone OnPush Angular, signals, Signal Forms, NgRx SignalStore, TanStack Table v9, Spartan UI, Tailwind and Bun/Nx.

## Dependencies

Prerequisites: [foundation and controls](00-foundation-and-shared-controls.md), [company context](03-company-context-and-shell.md), and [routes](10-routes.md).
Coordinate date conventions with [scheduling](09-shift-groups-and-shifts.md) and policy boundaries with [service eligibility](21-service-eligibility.md) and [release parity](22-release-and-parity.md).

## Contract And Business Gates

Domain references: C13, E3, F1 L07/L08, G and J4 Q20/Q21; primary evidence S09 and S19.
Q20 blocks assumed currency, unit, payer, per-person/trip/day basis, effective-version selection, precision and notice cutoffs; no end date/currency field is established.
Q21 must resolve whether `directionprices/{id}` addresses Route or Price and how detail/edit identity works; legacy hydration omits the existing price.
Q13 gates date/calendar/timezone conversion; preserve source types until a confirmed wire adapter exists, without invented effective-date or overlap constraints.
Positive penalty reveals multipliers in legacy UI with observed 0..5/1..5 bounds; optional DTO fields versus null-rejecting numeric validation require explicit omitted/zero policy.

## Pending Tasks

[ ] PRICE-01 Confirm supported pricing search/detail/create/update/delete operations, verbs, envelopes and identifiers through read-only source/schema inspection; explicitly resolve `directionprices/{id}` identity and never call production.
[ ] PRICE-02 Obtain Q20/Q21 and Q13 decisions for money/date units, precision, payer, version selection, detail hydration and omitted/zero penalties; do not invent missing currency/end-date fields or pricing algorithms.
[ ] PRICE-03 Inspect reusable libraries and generator help, dry-run then generate needed pricing libraries with Bun/Nx; keep forms/steps/tables in libraries and export typed config/provider/route or embedding factories.
[ ] PRICE-04 Register aliases, Nx scope/type tags, precise Route-related dependency edges and Sheriff mappings; reject app imports, feature cycles and UI dependencies from pricing data-access.
[ ] PRICE-05 Implement a route-scoped NgRx SignalStore keyed by session/company/Route ID/confirmed Price ID/effective-date query; cancel stale detail reads and invalidate only affected versions after saves.
[ ] PRICE-06 Build standalone OnPush pricing forms with local signals and Signal Forms; hydrate price/date/penalty/multipliers fully and map hidden, omitted, null and zero values only according to the confirmed contract.
[ ] PRICE-07 Reuse shared date, money/numeric, confirmation and field controls; label units only after Q20 agreement and expose typed submit/cancel intents without embedding billing behavior.
[ ] PRICE-08 Compose TanStack Table v9 and Spartan version/history presentation only for supported endpoint capabilities; provide loading/empty/error states and do not manufacture effective-version selection logic.
[ ] PRICE-09 Prove supported create-read-edit-read-delete roundtrips after Route persistence; verify existing price retention, correct Route-versus-Price IDs and optional-penalty contradictions rather than copying legacy omissions.
[ ] PRICE-10 Enforce authorized company/Route context without hardcoded company IDs; test inaccessible/deleted parents, direct URLs and switches, and avoid silently replacing dates or historical prices.
[ ] PRICE-11 Register Tailwind sources for library/Helm controls and use semantic logical styles; verify mobile RTL/LTR numeric/date presentation, keyboard access, conditional-field focus and error feedback.
[ ] PRICE-12 Mount pricing independently and within Route detail in an alternate consumer with different paths/API/destinations; verify lazy public entries do not assume panel wizard steps or concrete URLs.
[ ] PRICE-13 Add unit tests for confirmed money/date adapters, Route/Price identity, complete edit hydration, null/zero/hidden penalties, store races and mutation failures; keep undecided calculations out of assertions.
[ ] PRICE-14 Run discovered Bun/Nx targets and browser/accessibility tests for pricing roundtrips and conditional multipliers; verify protected client rendering, SSR/hydration isolation and disabled private transfer caching.
[ ] PRICE-15 Record Q20/Q21 decisions and implementation/test evidence before completion; distinguish fixture versus approved non-production acceptance and leave pricing-policy or unsupported-operation gaps explicit.

## Evidence Placeholder

Not completed. Q20/Q21/Q13 decisions, API operation matrix, public exports, Bun/Nx, browser/accessibility, alternate-consumer and client/SSR evidence: pending.
No production calls, executed fare/penalty calculations, billing completion or live-backend acceptance are claimed from legacy S09/S19.
