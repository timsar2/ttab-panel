# Realtime Tracking TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** legacy SignalR events reach one latest-location slot, but marker
mutation is commented out. Receiving a notification is not completed fleet tracking.

## Library Ownership and Dependencies

Generate reusable notification transport/lifecycle contracts and transport-domain
location normalization/state/feature libraries as concrete delivery requires.
Use Bun/Nx generators; no websocket services, tracking components, or marker helpers belong in the app.
Use [auth](01-authentication.md), [company context](03-company-context-and-shell.md),
[maps](17-maps-and-geography.md), and approved [service identity](21-service-eligibility.md).

## Contract Gates

Resolve Q22-Q25: authoritative Driver/Vehicle/Trip marker identity, nullable IDs,
company correlation, authorized recipient membership, event time/order, snapshots,
staleness, privacy, and retention. Current backend Admin/Trip groups are not proof
of company subscriptions or Manager authorization.

## Tasks

[ ] TRACK-01 Confirm the actual SignalR hub, notification method/arguments, transport policy, auth expiry, and support/location event contracts.
[ ] TRACK-02 Generate reusable transport and domain libraries with configurable hub URLs/tokens/subscription adapters and public APIs.
[ ] TRACK-03 Normalize the expected flat location payload instead of trusting the stale nested Coordinate interface or untyped casts.
[ ] TRACK-04 Establish approved joins from nullable Driver/Line/Driver-Line/Trip identifiers to company and actual Vehicle; do not invent a Vehicle ID in the payload.
[ ] TRACK-05 Implement idempotent authenticated startup, registration before events can be missed, retry/reconnect policy, and duplicate-listener prevention.
[ ] TRACK-06 Stop/unregister on logout/context loss and handle expired sessions, failed connection, and authorized scope restoration.
[ ] TRACK-07 Implement scoped keyed fleet positions with agreed freshness/order/deduplication rules instead of one global latest object.
[ ] TRACK-08 Implement the approved initial snapshot/recovery contract and truthful stale/disconnected states; do not fabricate missing timestamps or positions.
[ ] TRACK-09 Create/update real map markers through the shared adapter and correlate visible driver/vehicle/route information using approved identity.
[ ] TRACK-10 Add movement, heading, interpolation, or route matching only when supported by agreed data and product requirements.
[ ] TRACK-11 Keep support notifications on their typed channel and coordinate consumers without polluting filtered request lists or counts.
[ ] TRACK-12 Test reconnect, duplicate/out-of-order/malformed events, nullable IDs, company changes, logout races, and unauthorised subscriptions.
[ ] TRACK-13 Verify alternate app configuration and lazy browser-only rendering with no server globals, credential leakage, or listener leaks.
[ ] TRACK-14 Demonstrate real marker changes in deterministic browser tests and separately record live-hub/staging acceptance.

## Evidence

Record approved payload/subscription/identity contracts and event-to-marker
evidence. Do not mark tracking complete while the rendering endpoint remains a
stub, demo, or uncorrelated driver location.
