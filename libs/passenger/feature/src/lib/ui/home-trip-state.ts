import { ActiveTrip } from '../passenger.api'

export type PassengerTrackingStatus = 'live' | 'waiting' | 'last-known' | 'unavailable'

export function passengerTrackingStatus(
  connected: boolean,
  hasStreamLocation: boolean,
  hasLastKnownLocation: boolean,
): PassengerTrackingStatus {
  if (connected && hasStreamLocation) return 'live'
  if (connected) return hasLastKnownLocation ? 'last-known' : 'waiting'
  return hasLastKnownLocation ? 'last-known' : 'unavailable'
}

export function activeTripView(
  trip: ActiveTrip | null,
  loading: boolean,
  error: string | null,
): ActiveTrip | null {
  return !loading && !error ? trip : null
}

export function hasTripImage(url: string | null | undefined, failed: boolean): boolean {
  return Boolean(url && !failed)
}

export function driverInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toLocaleUpperCase() || '—'
  )
}

export function isFreshTripStreamLocation(
  location: {
    readonly tripId?: number | null
    readonly driverId?: number | null
    readonly receivedAt: string
  } | null,
  tripId: number | null,
  driverId: number | null,
  now: number,
): boolean {
  if (!location || location.tripId !== tripId || location.driverId !== driverId) return false
  const receivedAt = Date.parse(location.receivedAt)
  const age = now - receivedAt
  return Number.isFinite(receivedAt) && age >= 0 && age <= 120_000
}
