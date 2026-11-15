# Passenger Home and Driver Tracking

## Purpose

Show the Passenger's transport assignment and the current trip/Driver position so they can understand their pickup and commute status.

## Functional specification

- On home entry, load the Passenger's route/shift assignment, assigned stations, Driver location, and active-trip status.
- If an assignment exists, display its stations and show the Driver's live map position when available.
- If no assignment exists, explain that the Passenger must choose shift, route, and station through the drawer.
- If an active trip exists, show its trip/Driver details; distinguish no-current-trip (`204` in Flutter) from other errors.
- Provide retry for recoverable failures and support/drawer access.
- Display Driver name/image and phone-call action, vehicle image/type/plate, trip stations, and next-station progress when active-trip data is available.
- Without an active trip, show assigned stations.

## Flutter caveats

Arrival time is currently a hard-coded “20:00”; its calculation is commented out. Some station-row taps are placeholders. PWA must not imply ETA calculation or those actions are working until implemented against real data.

## Flutter source

`features/feature_customer/presentation/screen/customer_screen.dart`; `features/feature_customer/presentation/widgets/driver_selection.dart`; `features/feature_customer/presentation/bloc/customer_cubit.dart`.
