# Financial Dashboard (Registered, Not Exposed)

## Purpose

Present Driver earnings/travel summaries and drill-down trip details when a production data source is available.

## Observed Flutter UI

- Weekly, monthly, and yearly tabs.
- Total amount, chart, travel-detail cards, and a detail sheet.

## PWA implementation requirement

Treat this as a parity candidate, not a currently active Driver flow: the screen is route-registered but its Driver drawer entry is commented out. Flutter's displayed totals/chart and six detail rows are hard-coded, not live financial data. Do not present hard-coded values as production data. Confirm authorization, data contract, date semantics, and empty/error behavior before enabling it.

## Flutter source

`features/feature_financial/presentation/screens/financial_screen.dart`; `features/feature_financial/presentation/widgets/bar_chart.dart`; `features/feature_financial/presentation/widgets/details_available.dart`; commented entry in `features/feature_map/presentation/widgets/drawer_profile.dart`.
