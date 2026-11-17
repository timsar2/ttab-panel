import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { PASSENGER_IDENTITY } from './passenger.api'

export interface SupportViolationType {
  readonly id: number
  readonly code: string | null
  readonly title: string
}

export interface SupportTicket {
  readonly id: number
  readonly supportTypeId: number
  readonly supportTypeName: string
  readonly subject: string
  readonly requestDate: string
  readonly isAnswered: boolean
}

export interface SupportCaseFile {
  readonly personId: number
  readonly fullName: string
  readonly tripId: number
  readonly violations: readonly SupportViolationType[]
}

export interface SupportDetails extends SupportTicket {
  readonly companyId: number
  readonly personId: number
  readonly mobileNumber: string
  readonly caseFiles: readonly SupportCaseFile[]
}

export interface SupportMessage {
  readonly body: string
  readonly isAnswer: boolean
}

export interface CreateSupportRequest {
  readonly Id: 0
  readonly SupportTypeId: number
  readonly Subject: string
  readonly Body: string
  readonly ReportedPersonId?: number
  readonly TripId?: number
  readonly ViolationTypeIds?: string
  readonly OccureAt?: string
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The support service returned an invalid response.')
  }
  return value as Record<string, unknown>
}

function field(value: Record<string, unknown>, name: string): unknown {
  return value[name] ?? value[`${name[0].toUpperCase()}${name.slice(1)}`]
}

function result(value: unknown): unknown {
  const envelope = record(value)
  if (envelope['code'] !== '2000') {
    throw new Error(
      typeof envelope['massage'] === 'string'
        ? envelope['massage']
        : 'The support request was rejected.',
    )
  }
  return envelope['result']
}

function rows(value: unknown): unknown[] {
  const response = result(value)
  if (Array.isArray(response)) return response
  const list = field(record(response), 'list')
  if (!Array.isArray(list)) throw new Error('The support service returned an invalid list.')
  return list
}

function decodeViolation(value: unknown): SupportViolationType {
  const item = record(value)
  const id = Number(field(item, 'id'))
  const title = field(item, 'title')
  if (!Number.isSafeInteger(id) || id <= 0 || typeof title !== 'string') {
    throw new Error('The support service returned an invalid violation type.')
  }
  const code = field(item, 'code')
  return { id, code: typeof code === 'string' ? code : null, title }
}

function decodeCaseViolation(value: unknown): SupportViolationType {
  const item = record(value)
  return decodeViolation({
    id: field(item, 'supportViolationTypeId') ?? field(item, 'id'),
    code: field(item, 'code'),
    title: field(item, 'title'),
  })
}

function decodeTicket(value: unknown): SupportTicket {
  const item = record(value)
  const id = Number(field(item, 'id'))
  const supportTypeId = Number(field(item, 'supportTypeId'))
  const subject = field(item, 'subject')
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(supportTypeId)) {
    throw new Error('The support service returned an invalid ticket.')
  }
  return {
    id,
    supportTypeId,
    supportTypeName: String(field(item, 'supportTypeName') ?? ''),
    subject: typeof subject === 'string' ? subject : '',
    requestDate: String(field(item, 'requestDate') ?? ''),
    isAnswered: field(item, 'isAnswered') === true,
  }
}

function decodeDetails(value: unknown): SupportDetails {
  const item = record(result(value))
  const ticket = decodeTicket(item)
  const caseFiles = field(item, 'caseFile')
  return {
    ...ticket,
    companyId: Number(field(item, 'companyId')),
    personId: Number(field(item, 'personId')),
    mobileNumber: String(field(item, 'mobileNumber') ?? ''),
    caseFiles: Array.isArray(caseFiles)
      ? caseFiles.map(raw => {
          const file = record(raw)
          const violations = field(file, 'caseViolations')
          return {
            personId: Number(field(file, 'personId')),
            fullName: String(field(file, 'fullName') ?? ''),
            tripId: Number(field(file, 'tripId')),
            violations: Array.isArray(violations) ? violations.map(decodeCaseViolation) : [],
          }
        })
      : [],
  }
}

@Injectable()
export class PassengerSupportApi {
  private readonly http = inject(HttpClient)
  private readonly identity = inject(PASSENGER_IDENTITY)

  async violationTypes(personTypeId: 1 | 2): Promise<SupportViolationType[]> {
    return rows(
      await firstValueFrom(this.http.get(`/api/v1/support/violation-types/${personTypeId}`)),
    ).map(decodeViolation)
  }

  async search(supportTypeId: number): Promise<SupportTicket[]> {
    const { passengerId, companyId } = this.identity()
    if (
      !Number.isSafeInteger(passengerId) ||
      !passengerId ||
      !Number.isSafeInteger(companyId) ||
      !companyId
    ) {
      throw new Error('Passenger identity or company scope is unavailable.')
    }
    return rows(
      await firstValueFrom(
        this.http.post('/api/v1/support/search', {
          supportTypeId,
          pageNumber: 1,
          pageSize: 100,
          orderBy: ['RequestDate DESC'],
        }),
      ),
    ).map(decodeTicket)
  }

  async details(id: number): Promise<SupportDetails> {
    return decodeDetails(await firstValueFrom(this.http.get(`/api/v1/support/${id}`)))
  }

  async messages(id: number): Promise<SupportMessage[]> {
    return rows(await firstValueFrom(this.http.get(`/api/v1/support/${id}/messages`))).map(raw => {
      const item = record(raw)
      return {
        body: String(field(item, 'body') ?? ''),
        isAnswer: field(item, 'isAnswer') === true,
      }
    })
  }

  async create(request: CreateSupportRequest): Promise<SupportDetails> {
    return decodeDetails(await firstValueFrom(this.http.post('/api/v1/support', request)))
  }

  async reply(supportId: number, body: string): Promise<void> {
    result(await firstValueFrom(this.http.post('/api/v1/support/messages', { supportId, body })))
  }
}
