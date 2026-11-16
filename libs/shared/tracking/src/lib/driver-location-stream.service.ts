import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core'
import { TrackingConnectionService } from './tracking-connection.service'
import type { DriverLocationUpdate, PassengerTripNotification } from './tracking.models'

export interface DriverLocationFilter {
  driverId?: number | null
  tripId?: number | null
}

@Injectable({ providedIn: 'root' })
export class DriverLocationStreamService {
  private readonly tracking = inject(TrackingConnectionService)
  private readonly destroyRef = inject(DestroyRef)

  readonly location = signal<DriverLocationUpdate | null>(null)
  readonly tripNotification = signal<PassengerTripNotification | null>(null)

  constructor() {
    const ref = effect(() => {
      const loc = this.tracking.lastLocation()
      if (loc) this.location.set(loc)
    })
    const ref2 = effect(() => {
      const note = this.tracking.lastPassengerNotification()
      if (note) this.tripNotification.set(note)
    })
    this.destroyRef.onDestroy(() => {
      ref.destroy()
      ref2.destroy()
    })
  }

  matches(loc: DriverLocationUpdate | null, filter: DriverLocationFilter): boolean {
    if (!loc) return false
    if (filter.tripId != null && loc.tripId != null && loc.tripId !== filter.tripId) return false
    if (filter.driverId != null && loc.driverId != null && loc.driverId !== filter.driverId)
      return false
    return true
  }
}
