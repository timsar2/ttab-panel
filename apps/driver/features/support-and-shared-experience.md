# Support and Shared Experience

## Purpose

Give Drivers access to assistance and consistent app-wide onboarding, locale, theme, and error handling.

## Functional specification

- Driver home/drawer links to Help/Support.
- Help allows composing/submitting a support ticket and communicates validation, progress, success, and failure (as represented by the ticket flow).
- Shared PWA behavior includes first-run intro, English/Persian locale selection, theme preference, session-aware startup, and accessible responsive presentation.
- Report unexpected application/API errors through an approved safe telemetry path; avoid exposing sensitive data.
- About Us is registered but not exposed in the active Driver drawer; test screen and placeholder wrapper are not production Driver features.

## Flutter source

`features/feature_auth/presentation/screens/help_screen.dart`; `features/feature_auth/presentation/bloc/ticket_cubit/`; `core/shared/presentation/bloc/localization_bloc/`; `core/shared/presentation/bloc/theme_cubit/`; `main.dart`.
