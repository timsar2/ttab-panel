import { Injectable, signal } from '@angular/core'

@Injectable()
export class DriverLineState {
  private readonly _clientId = signal<number | null>(null)
  private readonly _driverLineId = signal<number | null>(null)
  private readonly _directionId = signal<number | null>(null)

  readonly clientId = this._clientId.asReadonly()
  readonly driverLineId = this._driverLineId.asReadonly()
  readonly directionId = this._directionId.asReadonly()

  restoreFromRoute(
    clientId: number | null,
    driverLineId: number | null,
    directionId: number | null,
  ) {
    this._clientId.set(clientId)
    this._driverLineId.set(driverLineId)
    this._directionId.set(directionId)
  }

  setDirectionId(directionId: number | null) {
    this._directionId.set(directionId)
  }
}
