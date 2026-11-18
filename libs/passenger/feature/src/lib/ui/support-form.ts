import { CreateSupportRequest, SupportViolationType } from '../support.api'
import { jalaliDateTimeToGregorian } from './jalali-date'

export function violationOptionLabel(violation: SupportViolationType): string {
  return violation.title
}

export function buildViolationReportFields(input: {
  reportedPersonId: number
  tripId: number
  violationIds: readonly number[]
  occurredDate: string
  occurredTime: string
}): Pick<CreateSupportRequest, 'ReportedPersonId' | 'TripId' | 'ViolationTypeIds' | 'OccureAt'> {
  return {
    ReportedPersonId: input.reportedPersonId,
    TripId: input.tripId,
    ViolationTypeIds: input.violationIds.join(','),
    OccureAt: jalaliDateTimeToGregorian(input.occurredDate, input.occurredTime),
  }
}
