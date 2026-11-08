# Operational Dashboard TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** the legacy default dashboard is an active hardcoded Mapbox demo;
summary/report widgets are dormant or static. The new workspace is only an auth
placeholder, not a migrated operational dashboard.

## Library Ownership and Dependencies

Generate a reusable transport dashboard feature and any genuinely shared widgets
inside Nx libraries. The app mounts its route only. Compose
[company context/shell](03-company-context-and-shell.md),
[support](19-support-requests.md), [maps](17-maps-and-geography.md), and
[tracking](18-realtime-tracking.md) according to approved operational scope.

## Tasks

[ ] DASH-01 Confirm the dashboard's actual users, company scope, required operational decisions, and source-backed widgets against Q03/Q22-Q26.
[ ] DASH-02 Classify legacy fixed markers, route grids, commented summaries, and analytics as demos/dormant behavior rather than live-feature parity.
[ ] DASH-03 Generate a reusable dashboard library with public routes, configuration, projected actions, and no panel imports.
[ ] DASH-04 Implement a truthful company workspace/navigation landing using available authorized capabilities before adding unapproved metrics.
[ ] DASH-05 Define approved data APIs and ownership for each live widget; omit or clearly explain unavailable information instead of manufacturing counts.
[ ] DASH-06 Compose live tracking/map surfaces only after their event-to-marker and identity/subscription gates are met.
[ ] DASH-07 Compose support notifications and navigation from verified request state without implying an approval/dispatch lifecycle.
[ ] DASH-08 Scope widget loads and caches by company/session and cancel or reject stale responses during rapid context changes.
[ ] DASH-09 Keep reporting, financial audits, replacement vehicles, route analytics, and new charts outside parity until separately approved contracts exist.
[ ] DASH-10 Verify alternate app configuration, permissions, private rendering, lazy widget/provider loading, and bundle budgets.
[ ] DASH-11 Verify true loading/empty/error/stale states, RTL/LTR/mobile layout, theme/density compatibility, and keyboard navigation.
[ ] DASH-12 Record real-data acceptance and screenshots proving that hardcoded demos and placeholder statistics are not presented as live operations.

## Evidence

Record approved widget scope and its authoritative data sources. A visually
complete dashboard with fake operational data is not complete migration.
