export interface DriverLocationUpdate {
  tripId?: number | null
  driverId?: number | null
  directionId?: number | null
  driverLineId?: number | null
  lineId?: number | null
  nextStationId?: number | null
  lat: number
  lng: number
  receivedAt: string
}

export interface PassengerTripNotification {
  tripId: number
  isTripActive?: boolean | null
}

export type TrackingConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface TrackingHubConfig {
  /** Hub URL, e.g. https://api.example.com/notifications or /notifications via BFF/proxy if available. */
  hubUrl: string
  withCredentials?: boolean
  accessTokenFactory?: () => string | Promise<string | null | undefined> | null | undefined
}

export const NOTIFICATION_FROM_SERVER = 'notificationFromServer'
export const LOCATION_NOTIFICATION = 'LocationNotification'
export const PASSENGER_NOTIFICATION = 'PassengerNotification'
