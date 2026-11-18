import {
  activeTripView,
  driverInitials,
  hasTripImage,
  isFreshTripStreamLocation,
  passengerTrackingStatus,
} from './home-trip-state'

describe('PassengerHomePage driver fallback', () => {
  it('uses up to two name initials when a driver image is unavailable', () => {
    expect(driverInitials('Sara Ahmadi')).toBe('SA')
    expect(driverInitials('Sara')).toBe('S')
    expect(driverInitials('   ')).toBe('—')
  })

  it('falls back after a supplied driver or vehicle image fails to load', () => {
    expect(hasTripImage('/driver.jpg', false)).toBe(true)
    expect(hasTripImage('/driver.jpg', true)).toBe(false)
    expect(hasTripImage(null, false)).toBe(false)
  })
})

describe('Passenger active-trip view transition', () => {
  const trip = {
    id: 1,
    driverId: 2,
    fullName: 'Driver',
    mobileNumber: '',
    stations: [],
  }

  it('shows resolved active trips and returns to the home view when the trip ends', () => {
    expect(activeTripView(trip, false, null)).toBe(trip)
    expect(activeTripView(null, false, null)).toBeNull()
  })

  it('does not show an active trip while loading or after a page error', () => {
    expect(activeTripView(trip, true, null)).toBeNull()
    expect(activeTripView(trip, false, 'Could not load')).toBeNull()
  })
})

describe('Passenger trip tracking status', () => {
  it('only labels a matching streamed update live while the connection is connected', () => {
    expect(passengerTrackingStatus(true, true, true)).toBe('live')
    expect(passengerTrackingStatus(false, true, true)).toBe('last-known')
  })

  it('does not mistake an HTTP last-known location for a live update', () => {
    expect(passengerTrackingStatus(true, false, true)).toBe('last-known')
    expect(passengerTrackingStatus(true, false, false)).toBe('waiting')
    expect(passengerTrackingStatus(false, false, false)).toBe('unavailable')
  })

  it('requires a recent stream location for the active trip and driver', () => {
    const now = Date.parse('2026-11-17T10:00:00Z')
    const location = {
      tripId: 10,
      driverId: 20,
      directionId: 30,
      nextStationId: 40,
      lat: 35.7,
      lng: 51.4,
      receivedAt: '2026-11-17T09:59:30Z',
    }

    expect(isFreshTripStreamLocation(location, 10, 20, now)).toBe(true)
    expect(isFreshTripStreamLocation(location, 11, 20, now)).toBe(false)
    expect(isFreshTripStreamLocation(location, 10, 21, now)).toBe(false)
    expect(
      isFreshTripStreamLocation({ ...location, receivedAt: '2026-11-17T09:55:00Z' }, 10, 20, now),
    ).toBe(false)
  })
})
