import { expect, type Page } from '@playwright/test'

export const credentials = {
  username: 'example@example.test',
  password: 'example-password',
} as const

export async function mockAuthentication(page: Page): Promise<void> {
  const payload = {
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'e2e-user',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Example',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'User',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Admin', 'Client'],
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid': '1',
    companyId: '1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fixture-signature`
  await page.route('**/api/tokens/get-by-email', async route => {
    expect(route.request().postDataJSON()).toEqual({
      email: credentials.username,
      password: credentials.password,
    })
    expect(route.request().headers()['authorization']).toBeUndefined()
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: '2000',
        massage: 'Success',
        result: {
          token,
          refreshToken: 'fixture-refresh',
          refreshTokenExpiryTime: new Date(Date.now() + 86400000).toISOString(),
        },
      }),
    })
  })
  await page.route('**/api/personal/logout', async route => {
    expect(route.request().headers()['authorization']).toBe(`Bearer ${token}`)
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Unavailable'] }),
    })
  })
}
