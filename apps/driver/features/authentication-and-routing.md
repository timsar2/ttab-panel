# Authentication and Role Routing

## Purpose

Give returning and new users secure access to the correct role-specific experience.

## Functional specification

- On first launch, present the introductory onboarding pages when the intro has not been completed; persist completion and continue to phone sign-in.
- Accept a phone number, validate it, request a one-time verification code, and allow OTP verification with validation and visible failure states.
- Persist the authenticated session/token after successful verification.
- Resolve the authenticated role from the session claims: `Driver` opens Driver route selection; other passenger/customer roles open the Passenger home.
- On later launches, route a valid saved session by role without repeating sign-in. A missing/invalid session routes to phone sign-in.
- Provide logout in the role drawer; clear local session state and return to phone sign-in after success.
- Display loading, API failure, retry, and invalid/expired session states; protect role routes from cross-role access.

## PWA parity notes

Flutter's role decision checks the `Driver` claim and treats every other authenticated role as Passenger. Preserve explicit role authorization while avoiding trusting client claims without server validation. Intro, theme, and locale are shared app capabilities rather than Driver-only behavior.

## Flutter source

`features/feature_intro/presentation/screens/splash_screen.dart`; `features/feature_intro/presentation/screens/intro_main_wrapper.dart`; `features/feature_auth/presentation/screens/phone_screen.dart`; `features/feature_auth/presentation/screens/code_phone_screen.dart`; `features/feature_map/presentation/widgets/drawer_profile.dart`.
