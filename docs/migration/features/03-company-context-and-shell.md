# Company Context and Protected Shell TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** shared layout primitives exist; operational company context and the
transport shell are not complete. Resolve domain questions Q01-Q04 and Q23.

## Library Ownership and Dependencies

Generate reusable company-context data-access and transport-shell feature/UI
libraries with Bun/Nx and public provider/guard/route/navigation contracts. Reuse
`@org/layout`; never place a new shell, page, navigation component, or guard in
`apps/panel`. Replace the existing app-local placeholder workspace when delivering
the real library-owned workspace, rather than copying its implementation pattern.

Depends on [authentication](01-authentication.md) and the minimal read/search
capability from [companies](04-companies.md), not all company CRUD.

## Tasks

[X] CONTEXT-01 Deliver auth-independent projected authentication/application layout primitives and current CDK directionality compatibility.
[ ] CONTEXT-02 Confirm authorized company membership, tenant distinctions, actor permissions, and the authoritative company lookup contract.
[ ] CONTEXT-03 Generate reusable company-context and protected-shell libraries with public configuration and no panel imports.
[ ] CONTEXT-04 Make route company ID authoritative, validate it, load authorized context, and reject mismatches, invalid IDs, missing companies, and denied access.
[ ] CONTEXT-05 Implement reusable company search/selection and navigation intent without treating the legacy always-true selection guard as valid policy.
[ ] CONTEXT-06 Handle parameter changes in reused routes; cancel prior context loads and reject late responses after switching company or session.
[ ] CONTEXT-07 Clear company-scoped records, selections, drafts, and realtime subscriptions on context loss, logout, or access revocation.
[ ] CONTEXT-08 Compose reusable responsive navigation, breadcrumbs, account/logout actions, and truthful scope/loading/error states with app-owned metadata.
[ ] CONTEXT-09 Mount protected domain routes through reusable factories and supply a matching private client-rendering/cache policy from the app.
[ ] CONTEXT-10 Preserve established company deep links or deliberate redirects without hardcoding mount paths inside library components.
[ ] CONTEXT-11 Verify manager/operator navigation against approved backend permissions without equating hidden links with authorization.
[ ] CONTEXT-12 Test two consumers with different mount paths, branding, navigation configuration, and company defaults.
[ ] CONTEXT-13 Verify login -> company selection -> authorized company workspace -> logout, including direct links and context switches.
[ ] CONTEXT-14 Verify library boundaries, RTL/mobile keyboard navigation, theme/sidebar modes, overlay direction, and production build budgets.

## Evidence

Record approved membership/permission decisions, route-context tests, consumer
configurations, and browser results. The existing authenticated placeholder does
not complete this workstream.
