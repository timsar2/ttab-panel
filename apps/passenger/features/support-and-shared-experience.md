# Passenger Support and Shared Experience

## Purpose

Provide Passenger help and consistent app-wide onboarding, language, theme, and reliable session behavior.

## Functional specification

- Passenger home and drawer expose the Help/Support screen.
- Allow a support ticket/message to be composed and submitted with validation, progress, success, and error feedback.
- Shared experience supports first-run onboarding, English/Persian locales, persisted theme preference, responsive PWA layout, and role-aware session startup/logout.
- Handle application errors safely without exposing credentials or private profile data.
- About Us is route-registered but not exposed from the active Passenger drawer; test/development screen and placeholder wrapper are excluded from production parity.

## Flutter source

`features/feature_auth/presentation/screens/help_screen.dart`; `features/feature_auth/presentation/bloc/ticket_cubit/`; `core/shared/presentation/bloc/localization_bloc/`; `core/shared/presentation/bloc/theme_cubit/`; `main.dart`.
