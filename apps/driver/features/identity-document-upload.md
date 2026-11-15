# Driver Identity and Qualification Documents

## Purpose

Collect and maintain Driver credentials required to verify eligibility to provide transport.

## Functional specification

- Driver profile exposes a document-upload destination only to Driver role.
- Load Driver document/qualification information and show existing status where available.
- Support uploading national identity card, driving licence, and Driver smart card; capture licence level where the workflow requires it.
- Validate selected files, show upload progress and success/failure, and refresh displayed document state after successful submission.
- Enforce role authorization in the PWA route/API, not only by hiding the profile link.

## Flutter source

`features/feature_profile/presentation/screens/upload_doc_screen.dart`; `features/feature_profile/presentation/utils/upload_doc_model.dart`; `features/feature_profile/presentation/utils/licence_level_model.dart`; Driver-only tile in `user_profile_screen.dart`.
