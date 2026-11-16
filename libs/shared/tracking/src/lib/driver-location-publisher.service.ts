import { DestroyRef, Injectable, inject, signal } from '@angular/core'

export interface DriverPublishPayload {
  tripId?: number | null
  directionId?: number | null
  driverLineId?: number | null
  lineId?: number | null
  nextStationId?: number | null
  lat: number
  lng: number
}

export interface DriverPublisherOptions {
  /** Called on each eligible position fix. Typically POST /api/v1/routings/location. */
  send: (payload: DriverPublishPayload) => Promise<void> | void
  /** Minimum meters moved before sending next update (Flutter parity target). */
  distanceFilterMeters?: number
  /** Safety throttle so high-frequency GPS doesn't spam server. */
  minIntervalMs?: number
  getContext: () => Omit<DriverPublishPayload, 'lat' | 'lng'> | null
  onError?: (error: unknown) => void
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

@Injectable({ providedIn: 'root' })
export class DriverLocationPublisherService {
  private readonly destroyRef = inject(DestroyRef)
  private watchId: number | null = null
  private timerId: ReturnType<typeof setInterval> | null = null
  private lastSentAt = 0
  private lastPoint: { lat: number; lng: number } | null = null
  private latestPoint: { lat: number; lng: number } | null = null
  private opts: DriverPublisherOptions | null = null
  private sending = false

  readonly running = signal(false)
  readonly permissionDenied = signal(false)
  readonly lastPosition = signal<{ lat: number; lng: number; accuracy?: number } | null>(null)

  constructor() {
    this.destroyRef.onDestroy(() => this.stop())
  }

  async start(options: DriverPublisherOptions): Promise<boolean> {
    this.stop()
    this.opts = options
    this.permissionDenied.set(false)
    this.lastPoint = null
    this.latestPoint = null
    this.lastSentAt = 0

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      options.onError?.(new Error('Geolocation is unavailable.'))
      return false
    }

    const granted = await this.ensurePermission()
    if (!granted) {
      this.permissionDenied.set(true)
      return false
    }

    this.running.set(true)

    // Immediate fix for fast UI/map centering and first publish.
    navigator.geolocation.getCurrentPosition(
      pos => this.onPosition(pos),
      err => this.onGeoError(err),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    )

    // Distance-based streaming (web equivalent of Flutter Geolocator distanceFilter).
    this.watchId = navigator.geolocation.watchPosition(
      pos => this.onPosition(pos),
      err => this.onGeoError(err),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    )

    // Periodic safety send (Flutter also emitted periodic updates).
    const interval = Math.max(10_000, options.minIntervalMs ?? 30_000)
    this.timerId = setInterval(() => void this.maybeSend(this.latestPoint, true), interval)

    return true
  }

  stop(): void {
    this.running.set(false)
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
    }
    this.watchId = null
    if (this.timerId) clearInterval(this.timerId)
    this.timerId = null
  }

  private async ensurePermission(): Promise<boolean> {
    try {
      if ('permissions' in navigator && navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        if (status.state === 'denied') return false
      }
      return true
    } catch {
      return true
    }
  }

  private onGeoError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) this.permissionDenied.set(true)
    this.opts?.onError?.(error)
  }

  private onPosition(pos: GeolocationPosition): void {
    const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    this.latestPoint = point
    this.lastPosition.set({ ...point, accuracy: pos.coords.accuracy })
    void this.maybeSend(point, false)
  }

  private async maybeSend(
    point: { lat: number; lng: number } | null,
    periodic: boolean,
  ): Promise<void> {
    if (!point || !this.opts || !this.running() || this.sending) return
    const ctx = this.opts.getContext()
    if (!ctx) return

    const distanceFilter = this.opts.distanceFilterMeters ?? 10
    const minInterval = this.opts.minIntervalMs ?? 5000
    const now = Date.now()

    if (this.lastPoint) {
      const moved = haversineMeters(this.lastPoint, point)
      const elapsed = now - this.lastSentAt
      if (!periodic && moved < distanceFilter) return
      if (periodic && moved < 1 && elapsed < minInterval) return
      if (!periodic && elapsed < minInterval && moved < distanceFilter * 2) return
    }

    this.sending = true
    try {
      await this.opts.send({ ...ctx, lat: point.lat, lng: point.lng })
      this.lastPoint = point
      this.lastSentAt = now
    } catch (err) {
      this.opts.onError?.(err)
    } finally {
      this.sending = false
    }
  }
}
