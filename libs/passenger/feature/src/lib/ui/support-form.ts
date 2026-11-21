import { CreateSupportRequest, SupportViolationType } from '../support.api'
import { jalaliDateTimeToGregorian } from './jalali-date'

export function violationOptionLabel(violation: SupportViolationType): string {
  return violation.title
}

export function buildViolationReportFields(input: {
  tripId: number
  violationIds: readonly number[]
  occurredDate: string
  occurredTime: string
}): Pick<CreateSupportRequest, 'TripId' | 'ViolationTypeIds' | 'OccureAt'> {
  return {
    TripId: input.tripId,
    ViolationTypeIds: input.violationIds.join(','),
    OccureAt: jalaliDateTimeToGregorian(input.occurredDate, input.occurredTime),
  }
}
