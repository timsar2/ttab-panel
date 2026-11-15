# Driver PWA Feature-Parity Backlog

Status: all items are pending. Mark `[X]` only after implementation and verification are complete.

## Foundation and access

- [ ] Establish Driver PWA routes, responsive shell, navigation, loading/empty/error patterns, and accessible controls.
- [ ] Implement first-run three-page onboarding and persist completion.
- [ ] Implement phone-number validation, OTP request, OTP verification, and visible retry/error states.
- [ ] Persist/refresh/clear authenticated session safely and route by authorized role.
- [ ] Route Driver sessions to route selection and reject Passenger sessions from Driver-only routes/actions.
- [ ] Add English/Persian localization and persisted theme behavior to the shared PWA foundation.
- [ ] Implement safe global error reporting without leaking tokens or personal data.

## Driver route selection and active trip

- [ ] Load Driver directions/departures and active-trip status on entry.
- [ ] Resume an existing active trip instead of starting a duplicate.
- [ ] Render available route cards with line/route, trip type, shift, and departure time.
- [ ] Implement start-trip submission with driver line, shift time, trip type, and direction identifiers.
- [ ] Handle no available directions, no active trip, loading, API error, and retry states.
- [ ] Implement the registered feasible/traffic-routes view with “your route” and “new route” tabs and route filters.
- [ ] Load stations for selected feasible route and continue to trip map.
- [ ] Confirm whether “new route” is only a route list or a real creation workflow; do not invent route creation absent an API/business contract.

## Live map and trip progress

- [ ] Request browser geolocation with clear permission/service guidance and graceful denial handling.
- [ ] Load vehicle/trip/station information and route geometry for the active trip.
- [ ] Render map (neshan map use same key from panel application) route, numbered station markers, and a continuously updated Driver location marker.
- [ ] Implement responsive draggable/expandable trip and station panel.
- [ ] Show ordered stations, next/last station state, and completed/upcoming progress.
- [ ] Add route/location failure and retry behavior without showing stale data as live.
- [ ] Provide map-to-drawer and map-to-support navigation.

## Station and passenger operations

- [ ] Open station detail with station name, address, and assigned passenger list.
- [ ] Display passenger details and make phone-call action available through supported web capabilities.
- [ ] Implement mark/unmark absent controls and track staged absence state per station/trip.
- [ ] Confirm backend contract for fetching passenger lists on station open; Flutter's call is commented out.
- [ ] Submit staged absence identifiers on station arrival and show success/failure feedback.
- [ ] Define/reset absence selections after submission based on server response; Flutter reset is commented out.
- [ ] Verify station arrival submission is idempotent and guards against duplicate actions.
- [ ] Implement end-trip confirmation and submit trip/direction identifiers.
- [ ] On successful end-trip, clear active-trip UI and return to route selection; retain state and explain failures.

## Driver profile and credentials

- [ ] Implement Driver drawer identity, profile image, vehicle type, and plate summary.
- [ ] Load/edit user identity, contact, address, province/city, and profile image.
- [ ] Validate and submit profile changes with upload progress and recoverable errors.
- [ ] Load/edit vehicle type, plate, color, year, capacity, and vehicle/card/insurance images.
- [ ] Implement image/file selection, validation, upload, preview, and persisted status for vehicle assets.
- [ ] Expose identity-document upload only to Driver role and enforce authorization server-side.
- [ ] Load Driver document status and support national ID, driving licence, and Driver smart-card uploads.
- [ ] Capture licence level where required; show upload progress, validation, success, and failure.

## Support and account lifecycle

- [ ] Implement Driver support screen and ticket submission flow with validation and outcome states.
- [ ] Implement drawer destinations for profile, vehicle profile, traffic routes, support, and logout.
- [ ] Logout must clear session and sensitive local data and return to phone sign-in.
- [ ] Ensure route guards handle expired sessions and unauthorized access.

## Conditional/disabled Flutter screen

- [ ] Decide whether to expose the registered Financial Dashboard; Flutter drawer entry is commented out.
- [ ] Replace weekly/monthly/yearly hard-coded totals, chart, and detail rows with an approved finance API before enabling.
- [ ] Specify finance authorization, period/date semantics, empty/error states, and detail-sheet behavior.

## Verification and parity

- [ ] Test Driver and Passenger role separation across startup, deep links, API actions, and logout.
- [ ] Test the complete OTP-to-route-start-to-station-operations-to-end-trip journey.
- [ ] Test location denied/unavailable, offline/retry, empty route, and service-error conditions.
- [ ] Verify responsive desktop/mobile layouts, keyboard access, screen-reader labels, and locale directionality.
- [ ] Ensure no Flutter demo/static station or finance values are presented as live production data.
