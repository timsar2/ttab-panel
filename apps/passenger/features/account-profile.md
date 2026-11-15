# Passenger Account Profile

## Purpose

Let Passengers review and maintain their identity and contact details used by the transport service.

## Functional specification

- Load user profile and support editing identity/contact/address, province/city, and profile image.
- Validate fields and submit updates with loading, success, and error feedback.
- Make profile accessible from the Passenger drawer.
- Do not expose Driver vehicle/document management controls to Passenger accounts.

## Flutter source

`features/feature_profile/presentation/screens/user_profile_screen.dart`; `features/feature_profile/presentation/bloc/user_bloc/`; `features/feature_customer/presentation/widgets/drawer_customer.dart`.
