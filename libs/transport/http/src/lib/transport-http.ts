import { HttpClient } from '@angular/common/http'
import { Injectable, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core'
import { catchError, defer, map, throwError } from 'rxjs'
import { normalizeTransportError } from './transport-adapters'

const TRANSPORT_API_URL = new InjectionToken<string>('TRANSPORT_API_URL')

/** Uses the consumer's existing scoped/authenticated HttpClient, never a second chain. */
function normalizeApiUrl(raw: string) {
  if (
    !raw ||
    /[\s\\%?#]/.test(raw) ||
    [...raw].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    raw.split('/').some(segment => segment === '.' || segment === '..') ||
    (!(raw.startsWith('/') && !raw.startsWith('//')) && !/^https?:\/\//i.test(raw))
  )
    throw new Error('Configure a root-relative or HTTP(S) transport API URL.')
  if (!raw.startsWith('/')) {
    const url = new URL(raw)
    if (url.username || url.password)
      throw new Error('Transport API URLs cannot contain credentials.')
  }
  return raw.replace(/\/+$/, '')
}

export function provideTransportHttp(config: { apiUrl: string }) {
  return makeEnvironmentProviders([
    { provide: TRANSPORT_API_URL, useValue: normalizeApiUrl(config.apiUrl) },
    TransportHttp,
  ])
}

@Injectable()
export class TransportHttp {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(TRANSPORT_API_URL)

  /** A decoder is mandatory: raw, enveloped, and paged endpoints are distinct contracts. */
  request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    decode: (value: unknown) => T,
    body?: unknown,
    options?: { apiUrl: string },
  ) {
    return defer(() => {
      // Endpoint paths cannot escape the configured boundary or supply query credentials.
      if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) {
        throw new Error('Invalid transport endpoint path.')
      }
      const apiUrl = options ? normalizeApiUrl(options.apiUrl) : this.apiUrl
      return this.http.request<unknown>(method, `${apiUrl}/${path}`, {
        body,
        transferCache: false,
        credentials: 'omit',
        redirect: 'error',
      })
    }).pipe(
      map(decode),
      catchError(error => throwError(() => normalizeTransportError(error))),
    )
  }
}
