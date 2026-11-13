export interface PassengerRow {
  readonly id: number
  readonly fullName: string
  readonly nationalId: string
  readonly profileImage: string
}

export interface PassengerOption {
  readonly id: number
  readonly name: string
}

export interface PassengerAssignment {
  readonly passengerIds: readonly number[]
  readonly shiftId: number
  readonly stationId: number
  readonly lineId?: number
  readonly fromDate: string
}

export function passengerSearchPayload(companyId: number, hasShift: boolean, fullName = '') {
  return {
    companyId,
    hasShift,
    hasStation: hasShift,
    ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
    pageNumber: 1,
    pageSize: 100,
  }
}
