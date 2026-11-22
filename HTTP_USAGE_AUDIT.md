# HTTP Usage Audit and Shared API Architecture

## Scope and method

This audit covers the four deployed Angular applications under `front/apps`: `passenger`, `driver`, `panel`, and `inspection`. App-owned routes are thin; calls are primarily in their feature and data-access libraries. Specs, the separate `shop` application/API server, map-provider calls, and real-time transports are not ordinary app backend HTTP requests and are excluded from the refactor inventory.

## Existing HTTP usage

### Passenger

- `apps/passenger/src/app/passenger/mobile-auth.backend.ts`: cookie mobile login and logout using `HttpClient.post`.
- `libs/passenger/feature/src/lib/passenger.api.ts`: passenger search, lookups (shifts/directions/stations/companies/states/cities), active trip and driver location, profile/user updates.
- `libs/passenger/feature/src/lib/support.api.ts`: support violation types, ticket search/detail/messages, ticket creation, and message submission.
- `libs/transport/scheduling/data-access/src/lib/shift-times.store.ts`: shift-times request shared with other platform apps.

### Driver

- `apps/driver/src/app/driver/mobile-auth.backend.ts`: cookie mobile login and logout using `HttpClient.post`.
- `libs/driver/feature/src/lib/driver-pwa-feature/driver.api.ts`: login; driver/vehicle lookup, search, and save; trips and trip lifecycle; route/direction geometry; passenger absence; location; profile/state/city lookup; support tickets.
- `libs/shared/tracking/src/lib/driver-location-publisher.service.ts`: real-time location publishing through the shared tracking transport, not a REST API call.

### Panel

- `libs/panel/feature/user/src/lib/users.routes.ts`: user search, detail, update, and delete.
- `libs/panel/feature/dashboard/src/lib/dashboard.routes.ts`: trip/metric, direction, route geometry/station, and support data requests.
- `libs/panel/feature/driver-line/src/lib/ui/driver-line-page.ts`: line/driver assignment and related lookups.
- Panel route composition and feature flows live in `libs/panel/drivers/src/lib/driver.routes.ts`, `libs/panel/people/src/lib/people.routes.ts`, `libs/panel/passengers/src/lib/passengers.routes.ts`, `libs/panel/inspection/src/lib/inspection.routes.ts`, `libs/panel/shift/src/lib/shift.routes.ts`, `libs/panel/departure-times/src/lib/departure-time.routes.ts`, and `libs/panel/support/src/lib/support.routes.ts`. These use the shared APIs listed below; the principal additional direct `HttpClient` call sites are the user, dashboard, and driver-line files above.
- Shared transport data-access wrappers: `libs/transport/vehicles/data-access/src/lib/vehicles-api.ts`, `routes/data-access/src/lib/routes-api.ts`, `lines/data-access/src/lib/lines-api.ts`, `drivers/data-access/src/lib/drivers-api.ts`, `people/data-access/src/lib/people-api.ts`, `scheduling/data-access/src/lib/scheduling-api.ts`, `departure-times/data-access/src/lib/departure-times-api.ts`, `inspection/data-access/src/lib/inspection-api.ts`, `support/data-access/src/lib/support-api.ts`, `company/data-access/src/lib/company-api.ts`, `company/data-access/src/lib/company-lookups-api.ts`, and `company/data-access/src/lib/company-context.store.ts`. These already funnel requests through `TransportHttp`.
- `libs/transport/http/src/lib/transport-http.ts`: common transport adapter; enforces endpoint path and API URL validation, disables transfer cache, omits credentials, rejects redirects, decodes endpoint-specific shapes, and normalizes errors.

### Inspection

- No standalone REST call implementation was found in `apps/inspection` or `libs/inspection/feature`. The app reuses panel inspection routes and `libs/transport/inspection/data-access/src/lib/inspection-api.ts`, listed above. The API is therefore shared with Panel rather than duplicated in Inspection.

### Other network clients

- `libs/shared/maps/src/lib/neshan-directions.ts` calls the third-party map directions endpoint with its provider API key; it is not a backend API call and remains a specialized provider integration.
- `libs/shared/tracking/src/lib/notification-connection.service.ts` handles server-sent events/notification streams, and the tracking feature uses SignalR. These streaming transports are intentionally not routed through the finite-request API facade.
- `libs/shared/auth/data-access/src/lib/auth.backend.ts` and the two mobile auth backends issue session/login/refresh/logout requests. These stay on the existing auth-aware `HttpClient` so `AUTH_BYPASS`, cookie credentials, SSR behavior, and refresh semantics remain intact; global interceptors still observe their responses/errors.

## Current gaps

- The old_panel `ApiService` is a typed HttpClient facade with per-operation success-message context; its reference interceptor only shows success messages when explicitly tagged.
- The four current apps share an auth-scoped `HttpClient` provider, but did not have a common success/error presentation interceptor. Request code commonly used raw `HttpClient` and bespoke envelope decoders.
- Panel's `TransportHttp` centralized network policy but did not provide common user-facing messages.
- Backend success envelopes use both `message` and the legacy misspelling `massage`; errors may contain `messages`, `errors`, or a top-level message.

## Target architecture and implemented integration

1. `libs/shared/http/core` is the shared `scope:shared`, `type:data` library. It exports a typed `ApiService`, an opt-in `API_MESSAGE` context token, and functional success/error interceptors.
2. `libs/shared/auth/data-access` registers the interceptors beside the existing `authInterceptor` in its scoped `provideHttpClient` chain. Ordering keeps authentication policy first and centralizes presentation for requests from all four apps without replacing their auth chain.
3. `libs/transport/http` delegates its validated low-level request to `ApiService`; the existing transport decoders, error normalization, URL boundary, and security options remain in place.
4. Successful envelopes with `message` or legacy `massage` are shown through the shared toast UI. `API_MESSAGE` allows callers to choose a semantic toast category; omitting it still permits backend-provided success messages to be shown consistently.
5. Errors are presented centrally (including offline, unauthorized, backend `messages`, and validation `errors`) and rethrown so existing feature-level recovery and form handling continue to work.
6. Specialized auth and streaming operations remain on HttpClient/SignalR/EventSource where their transport-specific semantics matter; they still flow through the registered HTTP interceptors for finite HTTP requests.

## Refactor status

Transport data-access callers now use the central `ApiService` indirectly through `TransportHttp`, and all four apps' scoped HTTP traffic receives consistent interceptor handling. Existing direct feature `HttpClient` calls remain source-compatible and pass through the same centralized interceptors; converting every endpoint wrapper to facade syntax is a follow-up cleanup rather than a behavior requirement and should preserve each endpoint's custom response decoder and request options.
