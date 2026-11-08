import { test, expect } from '@playwright/test'

test('does not accept credentials until hydration owns the form', async ({ page }) => {
  let releaseScripts: () => void = () => undefined
  const scriptsReady = new Promise<void>(resolve => {
    releaseScripts = resolve
  })
  await page.route('**/*.js', async route => {
    await scriptsReady
    await route.continue()
  })
  await page.route('**/api/tokens/get-by-email', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Invalid credentials.'] }),
    }),
  )
  try {
    await page.goto('/login', { waitUntil: 'commit' })
    await expect(page.locator('#username')).toBeDisabled()
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    releaseScripts()
    await expect(page.locator('#username')).toBeEnabled()
    await page.locator('#username').fill('hydrated@example.test')
    await page.locator('#password').fill('example-password')
    const submitted = page.waitForRequest('**/api/tokens/get-by-email')
    await page.locator('button[type="submit"]').click()
    expect((await submitted).postDataJSON()).toEqual({
      email: 'hydrated@example.test',
      password: 'example-password',
    })
  } finally {
    releaseScripts()
  }
})

test('defaults to an accessible Persian RTL login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false)
  const brand = await page.getByRole('link', { name: 'Panel', exact: true }).boundingBox()
  expect(brand?.height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('#username')).toHaveAttribute('autocomplete', 'username')
  await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  await expect(page.locator('#username')).not.toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#password')).not.toHaveAttribute('aria-invalid', 'true')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('#username-error')).toBeVisible()
  await expect(page.locator('#password-error')).toBeVisible()
  await expect(page.locator('#username')).toBeFocused()
})

test('switches appearance and displays a rejected login without fabricating a session', async ({
  page,
}) => {
  const errors: string[] = []
  let loginRequests = 0
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/tokens/get-by-email', route => {
    loginRequests++
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Invalid credentials.'] }),
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill('example')
  await page.locator('#password').fill('example-password')
  await page.locator('button[type="submit"]').click()
  const feedback = page.getByRole('status').locator('p')
  await expect(feedback).toContainText(/[\u0600-\u06ff]/)
  await expect(feedback).not.toContainText('Invalid credentials.')
  await expect(feedback).not.toContainText('Sign-in failed.')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(feedback).toHaveText('The username or password is incorrect.')
  expect(loginRequests).toBe(1)
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByLabel('Username', { exact: true }).fill('example')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Sign in to panel' }).click()
  await expect(
    page.getByText('The username or password is incorrect.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})

test('uses shared login, a protected layout, and best-effort logout with in-memory sessions', async ({
  page,
}) => {
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
      email: 'example@example.test',
      password: 'example-password',
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
  await page.goto('/workspace')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await page.getByLabel('Username', { exact: true }).fill('example@example.test')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Sign in to panel' }).click()
  await expect(page).toHaveURL(/\/workspace$/)
  await expect(page.getByRole('heading', { name: 'You are signed in' })).toBeVisible()
  await expect(page.getByText('Example User', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/workspace')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
})

test('fits a narrow viewport in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  const hasOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  expect(await hasOverflow()).toBe(false)
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your panel' })).toBeVisible()
  expect(await hasOverflow()).toBe(false)
})

test('serves the RTL login before JavaScript', async ({ request }) => {
  const response = await request.get('/login')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('dir="rtl"')
  expect(html).toContain('lang="fa"')
  expect(html).toContain('id="username"')
  expect(html).toContain('id="password"')
  const renderedUsername = html.match(/<input\b[^>]*id="username"[^>]*>/)?.[0]
  expect(renderedUsername).toContain('disabled')
})

test('enforces production SSR host, cache, and API boundaries', async ({ request }) => {
  test.skip(
    !process.env['BASE_URL'],
    'Requires the production SSR server, not the development API proxy',
  )
  const response = await request.get('/login')
  expect(response.headers()['cache-control']).toBe('no-store')
  const privatePage = await request.get('/workspace')
  expect(privatePage.status()).toBe(200)
  expect(await privatePage.text()).not.toContain('You are signed in')
  const unavailableApi = await request.get('/api/personal/logout')
  expect(unavailableApi.status()).toBe(503)
  expect(unavailableApi.headers()['content-type']).toContain('application/json')
  const rejected = await request.get('/login', {
    headers: { host: 'untrusted.example' },
  })
  expect(rejected.status()).toBe(400)
})
