import { HttpClient } from '@angular/common/http'
import { inject } from '@angular/core'
import { map } from 'rxjs'
import {
  AUTH_CONFIG,
  AuthBackend,
  createDefaultAuthBackend,
  validateAuthSession,
} from '@org/platform'
import type { AuthCredentials } from '@org/platform'

export function driverAuthBackend(): AuthBackend {
  const http = inject(HttpClient)
  const config = inject(AUTH_CONFIG)
  const shared = createDefaultAuthBackend()
  return {
    ...shared,
    login: ({ username, password }: AuthCredentials) =>
      http
        .post<unknown>(
          `${config.apiUrl.replace(/\/$/, '')}/auth/mobile-login`,
          {
            mobile: username,
            otp: password,
          },
          {
            headers: { 'X-Auth-Request': '1' },
            credentials: 'same-origin',
            transferCache: false,
            redirect: 'error',
          },
        )
        .pipe(map(validateAuthSession)),
    logout: () =>
      http.post(
        `${config.apiUrl.replace(/\/$/, '')}/auth/mobile-logout`,
        {},
        {
          headers: { 'X-Auth-Request': '1' },
          credentials: 'same-origin',
          transferCache: false,
          redirect: 'error',
        },
      ),
  }
}
