import { Injectable, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core'
import {
  TransportError,
  TransportHttp,
  transportInteger,
  transportRecord,
  unwrapTransport,
} from '@org/transport-http'
import { companyReference } from './company-write.models'

export interface CompanyLookup {
  readonly id: number
  readonly name: string
}
const GEOGRAPHY_API_URL = new InjectionToken<string>('COMPANY_GEOGRAPHY_API_URL')

export function provideCompanyLookups(config: { geographyApiUrl: string }) {
  return makeEnvironmentProviders([
    { provide: GEOGRAPHY_API_URL, useValue: config.geographyApiUrl },
    CompanyLookupsApi,
  ])
}

function decodeLookups(value: unknown, maximum = 32767): readonly CompanyLookup[] {
  if (!Array.isArray(value))
    throw new TransportError('contract', 0, 'The server returned an invalid lookup list.')
  const result = value.map(value => {
    const row = transportRecord(value)
    const name = row['name']
    if (typeof name !== 'string')
      throw new TransportError('contract', 0, 'The server returned an invalid lookup name.')
    return { id: transportInteger(row['id'], 1, maximum), name }
  })
  if (new Set(result.map(row => row.id)).size !== result.length) {
    throw new TransportError('contract', 0, 'The server returned duplicate lookup IDs.')
  }
  return result
}

@Injectable()
export class CompanyLookupsApi {
  private readonly http = inject(TransportHttp)
  private readonly geographyApiUrl = inject(GEOGRAPHY_API_URL)

  types() {
    return this.http.request('GET', 'companys/types', value =>
      unwrapTransport(value, result => decodeLookups(result, 255)),
    )
  }
  provinces() {
    return this.http.request(
      'GET',
      'states',
      value => unwrapTransport(value, decodeLookups),
      undefined,
      { apiUrl: this.geographyApiUrl },
    )
  }
  cities(provinceId: string, name = '') {
    return this.http.request(
      'POST',
      'states/Cities',
      value => unwrapTransport(value, decodeLookups),
      { provinceId: companyReference(provinceId), name: name.trim() || null },
      { apiUrl: this.geographyApiUrl },
    )
  }
}
