import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpContext,
  HttpContextToken,
} from '@angular/common/http'
import { toast } from '@spartan-ng/brain/sonner'
import { catchError, tap, throwError } from 'rxjs'

export type ApiMessageType =
  'success' | 'info' | 'warning' | 'error' | 'create' | 'update' | 'delete'

export const API_MESSAGE = new HttpContextToken<ApiMessageType | null>(() => null)

export function apiMessageContext(message?: ApiMessageType): HttpContext {
  return new HttpContext().set(API_MESSAGE, message ?? null)
}

function responseMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const message = body['message'] ?? body['massage']
  return typeof message === 'string' && message.trim() ? message : null
}

function errorMessages(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) return ['An unexpected error occurred.']
  if (error.status === 0)
    return ['Unable to connect to the server. Check your connection and try again.']
  if (error.status >= 500) return ['The server encountered an internal error.']
  const body = error.error as Record<string, unknown> | null
  const messages = body?.['messages']
  if (Array.isArray(messages))
    return messages.filter((item): item is string => typeof item === 'string')
  const errors = body?.['errors']
  if (errors && typeof errors === 'object') {
    const flattened = Object.values(errors)
      .flatMap(value => (Array.isArray(value) ? value : [value]))
      .filter((item): item is string => typeof item === 'string')
    if (flattened.length) return flattened
  }
  const message = responseMessage(body)
  return message
    ? [message]
    : [error.status === 401 ? 'Your session has expired.' : 'The request could not be completed.']
}

/** Displays successful backend messages only for explicitly opted-in operations. */
export const apiMessageInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    tap(event => {
      if ('body' in event) {
        const message = responseMessage(event.body)
        if (message) {
          const type = request.context.get(API_MESSAGE)
          if (type === 'error') toast.error(message)
          else if (type === 'info' || type === 'warning') toast(message)
          else toast.success(message)
        }
      }
    }),
  )
}

/** Presents API errors consistently and leaves the error observable intact for callers. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError(error => {
      const notify =
        error instanceof HttpErrorResponse && error.status >= 500 ? toast.warning : toast.error
      for (const message of errorMessages(error)) notify(message)
      return throwError(() => error)
    }),
  )
