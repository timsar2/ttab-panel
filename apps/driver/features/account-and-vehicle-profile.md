# Driver Account and Vehicle Profile

## Purpose

Keep Driver identity and operating vehicle details accurate for dispatch and passenger identification.

## Functional specification

- Driver drawer shows the user's name/profile image and available vehicle type/plate.
- User profile loads and edits identity, contact, address, province/city, and profile-image fields; submit changes and surface validation/result states.
- Vehicle profile loads/edits vehicle type, plate, color, year, capacity, and associated vehicle/card/insurance images.
- Provide image selection/upload progress, validation, errors, and persisted preview/state.
- Profile navigation is available to Driver; role-specific vehicle details are not presented as Passenger capabilities.

## Flutter source

`features/feature_map/presentation/widgets/drawer_profile.dart`; `features/feature_profile/presentation/screens/user_profile_screen.dart`; `features/feature_profile/presentation/screens/vehicle_profile_screen.dart`; `features/feature_profile/presentation/bloc/vehicle_cubit/`.
