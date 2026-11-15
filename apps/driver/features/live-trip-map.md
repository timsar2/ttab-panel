# Live Trip Map and Station Progress

## Purpose

Provide the Driver with geographic guidance and an at-a-glance view of the active trip's station progress.

## Functional specification

- For the active trip, load vehicle/trip/station data and request a route using current location and trip stations.
- Render route geometry, numbered station markers, and a Driver location marker updated from location changes.
- Provide a draggable trip/station panel and access to the Driver drawer and support.
- Present the next station (or last-station state), the ordered station list, and completed/upcoming status.
- Handle route/location loading and failures with a retry path; retain useful trip context when possible.
- Request and explain location permission/service requirements when live location cannot be provided.

## Flutter caveats

Location streaming starts after route directions complete. Preserve clear degraded states where geolocation or route service is unavailable; do not represent a static marker as live tracking.

## Flutter source

`features/feature_map/presentation/screens/map_screen.dart`; `features/feature_map/presentation/widgets/station_btn.dart`; `features/feature_map/presentation/bloc/map_cubit.dart`.
