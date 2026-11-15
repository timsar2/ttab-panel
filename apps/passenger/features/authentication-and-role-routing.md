# Authentication and Role Routing

## Purpose

Provide session-aware entry into the Passenger experience while preventing role confusion.

## Functional specification

- First launch may present the three-page intro; persist completion and continue to phone sign-in.
- Validate phone entry, request OTP, validate/submit OTP, and show progress and errors.
- Persist successful session and route a Passenger/customer role to Passenger home; Driver claim routes to Driver experience.
- On startup route valid sessions by role and route signed-out users to phone entry.
- Passenger drawer logout clears session and returns to phone sign-in.
- Guard Passenger routes and operations by authenticated role.

## Flutter source

`features/feature_intro/presentation/screens/splash_screen.dart`; `features/feature_intro/presentation/screens/intro_main_wrapper.dart`; `features/feature_auth/presentation/screens/phone_screen.dart`; `features/feature_auth/presentation/screens/code_phone_screen.dart`; `features/feature_customer/presentation/widgets/drawer_customer.dart`.
