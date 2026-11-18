import { TestBed } from '@angular/core/testing'
import { NotificationConnectionService } from './notification-connection.service'
import { TrackingConnectionService } from './tracking-connection.service'

class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  closed = false

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
    FakeEventSource.instances.push(this)
  }

  open(): void {
    this.readyState = FakeEventSource.OPEN
    this.onopen?.(new Event('open'))
  }

  message(data: string): void {
    this.onmessage?.({ data, lastEventId: '', origin: this.url } as MessageEvent)
  }

  close(): void {
    this.closed = true
    this.readyState = FakeEventSource.CLOSED
  }
}

describe('NotificationConnectionService', () => {
  let notifications: NotificationConnectionService

  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    TestBed.configureTestingModule({ providers: [NotificationConnectionService] })
    notifications = TestBed.inject(NotificationConnectionService)
  })

  afterEach(() => {
    notifications.ngOnDestroy()
    vi.unstubAllGlobals()
  })

  it('connects with credentials and dispatches namespaced notifications by channel', async () => {
    const locationListener = vi.fn()
    notifications.on('LocationNotification', locationListener)
    await notifications.connectCookieStream()

    const source = FakeEventSource.instances[0]
    expect(source.url).toBe('/api/auth/tracking-stream')
    expect(source.options).toEqual({ withCredentials: true })
    source.open()
    expect(notifications.connected()).toBe(true)

    const payload = { tripId: 1526, driverId: 315, lat: 35.7, lng: 51.3 }
    source.message(
      JSON.stringify({
        typeName: 'FSH.WebApi.Shared.Notifications.LocationNotification',
        payload,
      }),
    )
    expect(locationListener).toHaveBeenCalledWith(payload)
  })

  it('supports independent notification channels and idempotent unsubscribe', async () => {
    const firstListener = vi.fn()
    const secondListener = vi.fn()
    const removeFirst = notifications.on('LocationNotification', firstListener)
    const removeSecond = notifications.on('PassengerNotification', secondListener)
    await notifications.connectCookieStream()
    const source = FakeEventSource.instances[0]

    source.message(
      JSON.stringify({ typeName: 'LocationNotification', payload: { lat: 1, lng: 2 } }),
    )
    expect(firstListener).toHaveBeenCalledTimes(1)
    expect(secondListener).not.toHaveBeenCalled()

    removeFirst()
    removeFirst()
    const laterListener = vi.fn()
    notifications.on('LocationNotification', laterListener)
    source.message(
      JSON.stringify({ typeName: 'LocationNotification', payload: { lat: 3, lng: 4 } }),
    )
    expect(firstListener).toHaveBeenCalledTimes(1)
    expect(laterListener).toHaveBeenCalledTimes(1)

    source.message(JSON.stringify({ typeName: 'PassengerNotification', payload: { tripId: 1526 } }))
    expect(secondListener).toHaveBeenCalledTimes(1)
    removeSecond()
  })

  it('closes the stream on disconnect', async () => {
    await notifications.connectCookieStream()
    const source = FakeEventSource.instances[0]
    await notifications.disconnect()
    expect(source.closed).toBe(true)
    expect(notifications.state()).toBe('disconnected')
  })
})

describe('TrackingConnectionService notification channels', () => {
  let tracking: TrackingConnectionService
  let notifications: NotificationConnectionService

  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    TestBed.configureTestingModule({
      providers: [TrackingConnectionService, NotificationConnectionService],
    })
    tracking = TestBed.inject(TrackingConnectionService)
    notifications = TestBed.inject(NotificationConnectionService)
  })

  afterEach(() => {
    tracking.ngOnDestroy()
    notifications.ngOnDestroy()
    vi.unstubAllGlobals()
  })

  it('updates trip locations and clears them when a passenger notification ends the trip', async () => {
    await tracking.connectCookieStream()
    const source = FakeEventSource.instances[0]
    source.message(
      JSON.stringify({
        typeName: 'FSH.WebApi.Shared.Notifications.LocationNotification',
        payload: {
          tripId: 1526,
          driverId: 315,
          directionId: 22,
          driverLineId: 64,
          nextStationId: 89,
          Lat: 35.7862,
          Lng: 51.3924,
        },
      }),
    )
    expect(tracking.lastLocation()).toMatchObject({ tripId: 1526, driverId: 315, lat: 35.7862 })
    expect(tracking.driverLocations().get(315)?.tripId).toBe(1526)

    source.message(
      JSON.stringify({
        typeName: 'FSH.WebApi.Shared.Notifications.PassengerNotification',
        payload: { tripId: 1526, isTripActive: false },
      }),
    )
    expect(tracking.lastPassengerNotification()).toEqual({ tripId: 1526, isTripActive: false })
    expect(tracking.lastLocation()).toBeNull()
    expect(tracking.driverLocations().has(315)).toBe(false)
    expect(notifications.connected()).toBe(false)
  })
})
