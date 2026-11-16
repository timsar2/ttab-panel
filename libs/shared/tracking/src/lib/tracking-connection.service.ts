import { Injectable, OnDestroy, computed, signal } from '@angular/core'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr'
import {
  DriverLocationUpdate,
  LOCATION_NOTIFICATION,
  NOTIFICATION_FROM_SERVER,
  PASSENGER_NOTIFICATION,
  PassengerTripNotification,
  TrackingConnectionState,
  TrackingHubConfig,
} from './tracking.models'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeLocation(payload: unknown): DriverLocationUpdate | null {
  const r = asRecord(payload)
  if (!r) return null
  const lat = num(r['lat'] ?? r['Lat'])
  const lng = num(r['lng'] ?? r['Lng'])
  if (lat === null || lng === null) return null
  return {
    tripId: num(r['tripId'] ?? r['TripId']),
    driverId: num(r['driverId'] ?? r['DriverId']),
    directionId: num(r['directionId'] ?? r['DirectionId']),
    driverLineId: num(r['driverLineId'] ?? r['DriverLineId']),
    lineId: num(r['lineId'] ?? r['LineId']),
    nextStationId: num(r['nextStationId'] ?? r['NextStationId']),
    lat,
    lng,
    receivedAt: new Date().toISOString(),
  }
}

function normalizePassenger(payload: unknown): PassengerTripNotification | null {
  const r = asRecord(payload)
  if (!r) return null
  const tripId = num(r['tripId'] ?? r['TripId'])
  if (tripId === null) return null
  const active = r['isTripActive'] ?? r['IsTripActive']
  return { tripId, isTripActive: typeof active === 'boolean' ? active : null }
}

function notificationKind(typeName: unknown): string {
  if (typeof typeName !== 'string') return ''
  const dot = typeName.lastIndexOf('.')
  return dot >= 0 ? typeName.slice(dot + 1) : typeName
}

@Injectable({ providedIn: 'root' })
export class TrackingConnectionService implements OnDestroy {
  private connection: HubConnection | null = null
  private eventSource: EventSource | null = null
  private eventSourceUrl: string | null = null
  private config: TrackingHubConfig | null = null
  private startPromise: Promise<void> | null = null

  readonly state = signal<TrackingConnectionState>('disconnected')
  readonly connected = computed(() => this.state() === 'connected')
  readonly lastLocation = signal<DriverLocationUpdate | null>(null)
  readonly driverLocations = signal<ReadonlyMap<number, DriverLocationUpdate>>(new Map())
  readonly lastPassengerNotification = signal<PassengerTripNotification | null>(null)
  readonly error = signal<string | null>(null)

  async configure(config: TrackingHubConfig): Promise<void> {
    if (this.config?.hubUrl === config.hubUrl && this.connection) return
    await this.disposeConnection()
    this.config = config

    const builder = new HubConnectionBuilder()
      .withUrl(config.hubUrl, {
        withCredentials: config.withCredentials ?? true,
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: async () => {
          const token = await config.accessTokenFactory?.()
          return token ?? ''
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)

    const connection = builder.build()
    connection.on(NOTIFICATION_FROM_SERVER, (typeName: unknown, payload: unknown) => {
      this.handleNotification(typeName, payload)
    })
    connection.onreconnecting(() => this.state.set('reconnecting'))
    connection.onreconnected(() => this.state.set('connected'))
    connection.onclose(err => {
      this.state.set('disconnected')
      this.error.set(err?.message ?? null)
    })
    this.connection = connection
  }

  async connect(): Promise<void> {
    const connection = this.connection
    if (!connection) throw new Error('Tracking hub is not configured.')
    if (connection.state === HubConnectionState.Connected) {
      this.state.set('connected')
      return
    }
    if (this.startPromise) return this.startPromise
    this.state.set(
      connection.state === HubConnectionState.Reconnecting ? 'reconnecting' : 'connecting',
    )
    this.startPromise = connection
      .start()
      .then(() => {
        this.error.set(null)
        this.state.set('connected')
      })
      .catch(err => {
        this.state.set('disconnected')
        this.error.set(err instanceof Error ? err.message : 'Failed to connect to tracking hub.')
        throw err
      })
      .finally(() => {
        this.startPromise = null
      })
    return this.startPromise
  }

  /** Same-origin server bridge keeps upstream JWT credentials outside browser JavaScript. */
  async connectCookieStream(streamUrl = '/api/auth/tracking-stream'): Promise<void> {
    if (this.eventSource && this.eventSourceUrl === streamUrl) return
    await this.disposeConnection()
    this.config = null

    const source = new EventSource(streamUrl, { withCredentials: true })
    this.eventSource = source
    this.eventSourceUrl = streamUrl
    this.state.set('connecting')
    source.onopen = () => {
      this.error.set(null)
      this.state.set('connected')
    }
    source.onmessage = event => {
      try {
        const notification = asRecord(JSON.parse(event.data) as unknown)
        if (notification) this.handleNotification(notification['typeName'], notification['payload'])
      } catch {
        this.error.set('The tracking stream returned an invalid event.')
      }
    }
    source.onerror = () => {
      this.state.set('reconnecting')
      this.error.set('The tracking stream is reconnecting.')
    }
  }

  async disconnect(): Promise<void> {
    const hadEventSource = this.eventSource !== null
    this.eventSource?.close()
    this.eventSource = null
    this.eventSourceUrl = null
    const connection = this.connection
    if (!connection) {
      if (hadEventSource) this.state.set('disconnected')
      return
    }
    try {
      if (connection.state !== HubConnectionState.Disconnected) await connection.stop()
    } finally {
      this.state.set('disconnected')
    }
  }

  private handleNotification(typeName: unknown, payload: unknown): void {
    const kind = notificationKind(typeName)
    if (kind === LOCATION_NOTIFICATION) {
      const location = normalizeLocation(payload)
      if (location) {
        this.lastLocation.set(location)
        if (location.driverId !== null && location.driverId !== undefined) {
          this.driverLocations.update(current => {
            const next = new Map(current)
            next.set(location.driverId!, location)
            return next
          })
        }
      }
      return
    }
    if (kind === PASSENGER_NOTIFICATION) {
      const note = normalizePassenger(payload)
      if (note) {
        this.lastPassengerNotification.set(note)
        if (note.isTripActive === false) {
          this.driverLocations.update(current => {
            const next = new Map(current)
            for (const [driverId, location] of next)
              if (location.tripId === note.tripId) next.delete(driverId)
            return next
          })
          if (this.lastLocation()?.tripId === note.tripId) this.lastLocation.set(null)
        }
      }
    }
  }

  private async disposeConnection(): Promise<void> {
    this.eventSource?.close()
    this.eventSource = null
    this.eventSourceUrl = null
    const connection = this.connection
    this.connection = null
    this.startPromise = null
    if (!connection) return
    try {
      connection.off(NOTIFICATION_FROM_SERVER)
      if (connection.state !== HubConnectionState.Disconnected) await connection.stop()
    } catch {
      /* ignore cleanup errors */
    } finally {
      this.state.set('disconnected')
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.disposeConnection()
  }
}
