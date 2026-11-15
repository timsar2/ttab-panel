# Route Management and Filters

## Purpose

Let Drivers inspect their routes and available route/departure choices, then start a selected trip.

## Functional specification

- Present “your route” and “new route” categories/tabs.
- Load and display route cards with direction, trip type, and departure time.
- Offer the route filter sheet and apply selected criteria to the displayed route list.
- Starting a route loads its stations and continues to the map/trip experience.
- Support loading, no-results, service-error, and retry states.

## Flutter caveats

This screen is registered as `FeasibleScreen` and used by the Driver drawer's traffic-routes entry. “New route” currently reuses the same directions-list API/state as “your route”; there is no distinct route-creation operation. Treat creation as out of scope unless a real business/API contract is supplied.

## Flutter source

`features/feature_feasible/presentation/screen/feasible_screen.dart`; `features/feature_feasible/presentation/widgets/filter_btn.dart`.
