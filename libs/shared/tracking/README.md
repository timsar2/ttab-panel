# @org/shared-tracking

Reusable SignalR tracking integration for Driver, Passenger, and Panel apps.

- Connection lifecycle (`TrackingConnectionService`)
- Driver distance-based publishing (`DriverLocationPublisherService`)
- Live location stream for map UIs (signals fed from hub notifications)

Backend hub: `/notifications`, server event: `notificationFromServer` (`LocationNotification`, `PassengerNotification`).
