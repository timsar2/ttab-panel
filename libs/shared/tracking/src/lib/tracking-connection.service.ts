import { Injectable, OnDestroy, computed, inject, isDevMode, signal } from '@angular/core'
import {
  LOCATION_NOTIFICATION,
  PASSENGER_NOTIFICATION,
  PassengerTripNotification,
  TrackingConnectionState,
  TrackingHubConfig,
} from './tracking.models'
import type { DriverLocationUpdate } from './tracking.models'
import { NotificationConnectionService } from './notification-connection.service'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeLocation(payload: unknown): DriverLocationUpdate | null {
  const record = asRecord(payload)
  if (!record) return null
  const lat = num(record['lat'] ?? record['Lat'])
  const lng = num(record['lng'] ?? record['Lng'])
  if (lat === null || lng === null) return null
  return {
    tripId: num(record['tripId'] ?? record['TripId']),
    driverId: num(record['driverId'] ?? record['DriverId']),
    directionId: num(record['directionId'] ?? record['DirectionId']),
    driverLineId: num(record['driverLineId'] ?? record['DriverLineId']),
    lineId: num(record['lineId'] ?? record['LineId']),
    nextStationId: num(record['nextStationId'] ?? record['NextStationId']),
    heading: num(record['heading'] ?? record['Heading'] ?? record['bearing'] ?? record['Bearing']),
    lat,
    lng,
    receivedAt: new Date().toISOString(),
  }
}

function normalizePassenger(payload: unknown): PassengerTripNotification | null {
  const record = asRecord(payload)
  if (!record) return null
  const tripId = num(record['tripId'] ?? record['TripId'])
  if (tripId === null) return null
  const active = record['isTripActive'] ?? record['IsTripActive']
  return { tripId, isTripActive: typeof active === 'boolean' ? active : null }
}

@Injectable({ providedIn: 'root' })
export class TrackingConnectionService implements OnDestroy {
  private readonly notifications = inject(NotificationConnectionService)
  private readonly removeLocationListener = this.notifications.on<unknown>(
    LOCATION_NOTIFICATION,
    payload => this.handleLocation(payload),
  )
  private readonly removePassengerListener = this.notifications.on<unknown>(
    PASSENGER_NOTIFICATION,
    payload => this.handlePassenger(payload),
  )

  readonly state = this.notifications.state
  readonly connected = this.notifications.connected
  readonly error = this.notifications.error
  readonly lastLocation = signal<DriverLocationUpdate | null>(null)
  readonly driverLocations = signal<ReadonlyMap<number, DriverLocationUpdate>>(new Map())
  readonly lastPassengerNotification = signal<PassengerTripNotification | null>(null)

  configure(config: TrackingHubConfig): Promise<void> {
    return this.notifications.configure(config)
  }

  connect(): Promise<void> {
    return this.notifications.connect()
  }

  connectCookieStream(streamUrl?: string): Promise<void> {
    return this.notifications.connectCookieStream(streamUrl)
  }

  disconnect(): Promise<void> {
    return this.notifications.disconnect()
  }

  ngOnDestroy(): void {
    this.removeLocationListener()
    this.removePassengerListener()
  }

  private handleLocation(payload: unknown): void {
    if (isDevMode()) {
      console.info('[Tracking] LocationNotification listener fired', payload)
    }

    const location = normalizeLocation(payload)
    if (!location) {
      if (isDevMode()) {
        console.warn('[passenger-tracking] LocationNotification payload could not be normalized')
      }
      return
    }

    this.lastLocation.set(location)
    if (location.driverId !== null && location.driverId !== undefined) {
      this.driverLocations.update(current => {
        const next = new Map(current)
        next.set(location.driverId!, location)
        return next
      })
    }
    if (isDevMode()) {
      console.info('[Tracking] Driver location updated', {
        tripId: location.tripId,
        driverId: location.driverId,
        latitude: location.lat,
        longitude: location.lng,
      })
    }
  }

  private handlePassenger(payload: unknown): void {
    if (isDevMode()) console.info('[Tracking] PassengerNotification listener fired', payload)
    const notification = normalizePassenger(payload)
    if (!notification) return
    this.lastPassengerNotification.set(notification)
    if (notification.isTripActive === false) {
      this.driverLocations.update(current => {
        const next = new Map(current)
        for (const [driverId, location] of next)
          if (location.tripId === notification.tripId) next.delete(driverId)
        return next
      })
      if (this.lastLocation()?.tripId === notification.tripId) this.lastLocation.set(null)
    }
  }
}
