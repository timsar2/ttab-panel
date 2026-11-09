import { expect, type Page } from '@playwright/test'

export const credentials = {
  username: 'example@example.test',
  password: 'example-password',
} as const

export async function mockAuthentication(page: Page): Promise<void> {
  let authenticated = false
  const session = {
    user: {
      id: 'e2e-user',
      firstName: 'Example',
      lastName: 'User',
      roles: ['Admin', 'Client'],
      businessEntityId: 1,
      companyId: 1,
    },
    expiresAt: Date.now() + 3600000,
  }
  await page.route('**/api/auth/session', route =>
    route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(authenticated ? session : { messages: ['Authentication required.'] }),
    }),
  )
  await page.route('**/api/auth/login', async route => {
    expect(route.request().postDataJSON()).toEqual(credentials)
    expect(route.request().headers()['authorization']).toBeUndefined()
    expect(route.request().headers()['x-auth-request']).toBe('1')
    authenticated = true
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })
  await page.route('**/api/auth/logout', async route => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().headers()['authorization']).toBeUndefined()
    authenticated = false
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Unavailable'] }),
    })
  })
}
