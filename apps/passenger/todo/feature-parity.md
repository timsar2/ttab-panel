# Passenger PWA Feature-Parity Backlog

Status: all items are pending. Mark `[X]` only after implementation and verification are complete.

## Foundation and access

- [ ] Establish Passenger PWA routes, responsive shell, navigation, accessible controls, and shared loading/empty/error patterns.
- [ ] Implement first-run three-page onboarding and persist completion.
- [ ] Implement phone-number validation, OTP request, OTP verification, and visible retry/error states.
- [ ] Persist/refresh/clear authenticated session safely and route by authorized role.
- [ ] Route Passenger/customer sessions to Passenger home and reject Driver sessions from Passenger-only actions.
- [ ] Add English/Persian localization and persisted theme behavior to the shared PWA foundation.
- [ ] Implement safe global error reporting without leaking tokens or personal data.

## Passenger assignment and home

- [ ] Load Passenger route/shift assignment, station assignment, Driver location, and active-trip status on home entry.
- [ ] Render a useful no-assignment state explaining how to select shift, route, and station.
- [ ] Distinguish an active trip from the no-current-trip response (`204`) and other service failures.
- [ ] Show assigned stations when there is no active trip and trip stations when one is active.
- [ ] Show Driver name/image and supported phone-call action for an active trip.
- [ ] Show vehicle image/type/plate and trip details when provided by the active trip.
- [ ] Render the Driver position on a map (neshan map use same key from panel application) when location data is available and identify stale/unavailable data.
- [ ] Implement next-station/progress display from actual trip data.
- [ ] Replace Flutter's hard-coded `20:00` arrival label with an approved ETA source/calculation or omit ETA until reliable.
- [ ] Implement retry and recovery for assignment, active-trip, station, and location requests.
- [ ] Identify placeholder station-row taps and implement only actions with confirmed requirements; otherwise make them non-interactive.
- [ ] Provide Passenger drawer and support access from home.

## Shift, route, and station assignment

- [ ] Load current Passenger assignment, available shifts, directions/routes, and stations.
- [ ] Render current assignment and selectable shift options with clear selected state.
- [ ] Render route choices based on the selected shift/context.
- [ ] Load and display valid stations for selected route/direction.
- [ ] Allow station selection and validate required assignment fields before submission.
- [ ] Submit the Passenger company batch/assignment using selected values.
- [ ] Confirm success and refresh home assignment/station state.
- [ ] Preserve current persisted assignment until a new selection is successfully submitted.
- [ ] Handle loading, empty choices, validation, API failure, and retry states.
- [ ] Make assignment flow accessible from the Passenger drawer as “set shift and route.”

## Passenger profile

- [ ] Load/edit identity, contact, address, province/city, and profile image.
- [ ] Validate fields and submit profile updates with loading, success, and failure states.
- [ ] Support profile-image selection/upload, progress, and persisted preview.
- [ ] Keep Driver vehicle and identity-document controls unavailable to Passenger users.

## Support and account lifecycle

- [ ] Implement Passenger help/support screen and ticket submission with validation and outcome states.
- [ ] Implement Passenger drawer destinations for profile, set shift/route, support, and logout.
- [ ] Logout must clear session and sensitive local data and return to phone sign-in.
- [ ] Ensure route guards handle expired sessions and unauthorized access.

## Verification and parity

- [ ] Test Passenger onboarding/sign-in to assignment selection to home tracking journey.
- [ ] Test no assignment, no active trip (`204`), active trip, missing location, and service-error states.
- [ ] Test assignment changes do not replace persisted values until successful server confirmation.
- [ ] Verify responsive desktop/mobile layouts, keyboard access, screen-reader labels, and locale directionality.
- [ ] Test Driver and Passenger role separation across startup, deep links, API actions, and logout.
- [ ] Ensure hard-coded/demo Flutter values are not presented as live production data.
