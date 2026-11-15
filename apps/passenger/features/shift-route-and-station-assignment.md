# Shift, Route, and Station Assignment

## Purpose

Allow a Passenger to choose their commute schedule and pickup/drop-off assignment for the company transport service.

## Functional specification

- Load current assignment, available shifts, directions/routes, and stations relevant to the choices.
- Present shift and route selection with the current assignment reflected when available.
- Allow station selection from the stations available for the selected direction/shift.
- Submit the Passenger's company batch/assignment using the selected values.
- Confirm successful assignment and refresh home data; surface field validation, loading, API failure, and retry states.
- Do not silently discard an existing assignment; clearly distinguish unsaved selection from persisted assignment.

## Flutter source

`features/feature_customer/presentation/screen/set_shift_screen.dart`; `features/feature_customer/presentation/bloc/shift_cubit/shift_cubit.dart`; `features/feature_customer/presentation/widgets/drawer_customer.dart`.
