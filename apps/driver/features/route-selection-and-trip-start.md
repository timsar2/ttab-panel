# Route Selection and Trip Start

## Purpose

Let a Driver choose an assigned departure and establish the active trip that powers navigation and passenger operations.

## Functional specification

- On entry, load the Driver's available direction/departure options and query whether a trip is already active.
- If an active trip exists, continue to its live map instead of allowing an accidental duplicate start.
- If no active trip exists, show available route cards with route/line, trip type, shift, and departure time.
- Starting a route submits the selected `driverLineId`, `shiftTimeId`, `tripTypeId`, and `directionId`; on success open the active-trip map.
- Show loading, empty/no-active-trip, and retriable service-error states.
- Keep route selection reachable from the Driver's home/drawer; support navigating to route management and back.

## Flutter caveats

Startup and successful OTP explicitly route Drivers to `ChooseDirectionsScreen`. `FeasibleScreen` is separately registered and the drawer links to it as traffic routes; its “new route” tab currently calls the same directions-list state/API and does not implement route creation. Location permission helper code in route selection is commented out; startup requests location permission.

## Flutter source

`features/feature_map/presentation/screens/choose_directions_screen.dart`; `features/feature_feasible/presentation/screen/feasible_screen.dart`; `features/feature_map/presentation/bloc/map_cubit.dart`.
