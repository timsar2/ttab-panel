# Station and Passenger Operations

## Purpose

Allow the Driver to verify station pickup attendance and communicate with assigned passengers.

## Functional specification

- Open station details showing station name/address and its passenger list.
- Show passenger identity/contact affordances and allow calling a passenger.
- Allow the Driver to mark/unmark a passenger absent using the station passenger swipe/action control.
- Keep staged absence changes associated with the correct station/trip.
- On “I arrived at the station,” submit the relevant absence IDs and report success or failure.
- Provide station completion/progress feedback and prevent accidental duplicate/ambiguous submissions.

## Flutter caveats

Passenger data is read from station data already present in the trip. The fetch-passengers-on-open call and absence-state reset in the Flutter sheet are commented out; the UI and absence submission path exist, but these two behaviors are not active. The PWA should implement only confirmed intended behavior after aligning API contracts, and must not falsely claim fresh server data.

## Flutter source

`features/feature_map/presentation/widgets/station_btn.dart`; `features/feature_map/presentation/bloc/map_cubit.dart`.
