import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, take } from 'rxjs'
import { apiMessageContext, type ApiMessageType } from './http-interceptors'

/** Typed, one-shot HTTP facade shared by application data-access layers. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient)

  request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options: {
      body?: unknown
      params?: HttpParams
      headers?: HttpHeaders | Record<string, string | string[]>
      transferCache?: boolean
      credentials?: RequestCredentials
      redirect?: RequestRedirect
    } = {},
    message?: ApiMessageType,
  ): Observable<T> {
    return this.http
      .request<T>(method, url, { ...options, context: this.context(message) })
      .pipe(take(1))
  }

  get<T>(
    url: string,
    options: { params?: HttpParams; headers?: HttpHeaders } = {},
    message?: ApiMessageType,
  ): Observable<T> {
    return this.http.get<T>(url, { ...options, context: this.context(message) }).pipe(take(1))
  }

  post<T, D = unknown>(
    url: string,
    body: D,
    message?: ApiMessageType,
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.post<T>(url, body, { headers, context: this.context(message) }).pipe(take(1))
  }

  put<T, D = unknown>(
    url: string,
    body: D,
    message?: ApiMessageType,
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.put<T>(url, body, { headers, context: this.context(message) }).pipe(take(1))
  }

  delete<T>(url: string, message?: ApiMessageType, headers?: HttpHeaders): Observable<T> {
    return this.http.delete<T>(url, { headers, context: this.context(message) }).pipe(take(1))
  }

  private context(message?: ApiMessageType): HttpContext {
    return apiMessageContext(message)
  }
}
