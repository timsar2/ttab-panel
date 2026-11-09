import { test, expect } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('company table uses server paging and search with keyboard/mobile RTL and LTR', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      !/Failed to load resource|fonts.googleapis/.test(message.text())
    ) {
      errors.push(message.text())
    }
  })
  await mockAuthentication(page)
  const requests: { name: string | null; pageNumber: number; pageSize: number }[] = []
  await page.route('**/api/v1/companys/search', async route => {
    const query = route.request().postDataJSON()
    requests.push(query)
    expect(route.request().headers()['authorization']).toBeUndefined()
    expect(route.request().headers()['x-auth-request']).toBe('1')
    if (query.name === 'denied') {
      await route.fulfill({ status: 403, json: {} })
      return
    }
    if (query.name === 'error') {
      await route.fulfill({ status: 500, json: { exception: 'private database details' } })
      return
    }
    const list =
      query.name === 'empty'
        ? []
        : [
            {
              id: query.pageNumber,
              name: `${query.name ?? 'Company'} page ${query.pageNumber}`,
              companyTypeName: 'Transport',
              provinceName: 'Province',
              cityName: 'City',
              companyLogo: null,
            },
          ]
    await route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          list,
          pagination: {
            currentPage: query.pageNumber,
            pageSize: query.pageSize,
            totalCount: list.length ? 21 : 0,
            totalPages: list.length ? 3 : 0,
            hasPreviousPage: query.pageNumber > 1,
            hasNextPage: list.length > 0 && query.pageNumber < 3,
          },
        },
      },
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/companies')
  await expect(page.getByRole('cell', { name: 'Company page 1', exact: true })).toBeVisible()
  expect(requests[0]).toEqual({ name: null, pageNumber: 1, pageSize: 10 })
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('cell', { name: 'Company page 2', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Company page 1', exact: true })).toHaveCount(0)
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      const next = page.getByRole('button', { name: 'Next', exact: true })
      expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await page.getByRole('region', { name: 'Companies', exact: true }).focus()
      await expect(page.getByRole('region', { name: 'Companies', exact: true })).toBeFocused()
    }
  }
  const search = page.getByRole('searchbox', { name: 'Company name' })
  await search.fill('Filtered')
  await search.press('Enter')
  await expect(page.getByRole('cell', { name: 'Filtered page 1', exact: true })).toBeVisible()
  expect(requests[requests.length - 1]).toEqual({ name: 'Filtered', pageNumber: 1, pageSize: 10 })
  await search.fill('empty')
  await search.press('Enter')
  await expect(page.getByRole('status')).toContainText('No records found.')
  for (const [name, message] of [
    ['denied', 'You do not have access to company search.'],
    ['error', 'The request could not be completed.'],
  ]) {
    await search.fill(name)
    await search.press('Enter')
    await expect(page.getByRole('cell', { name: 'Filtered page 1', exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toContainText(message)
  }
  await expect(page.getByText('private database details')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('does not accept credentials until hydration owns the form', async ({ page }) => {
  let releaseScripts: () => void = () => undefined
  const scriptsReady = new Promise<void>(resolve => {
    releaseScripts = resolve
  })
  await page.route('**/*.js', async route => {
    await scriptsReady
    await route.continue()
  })
  await page.route('**/api/auth/login', route =>
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
    const submitted = page.waitForRequest('**/api/auth/login')
    await page.locator('button[type="submit"]').click()
    expect((await submitted).postDataJSON()).toEqual({
      username: 'hydrated@example.test',
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
  await page.route('**/api/auth/login', route => {
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

test('uses shared cookie login, a protected layout, and local-first logout', async ({ page }) => {
  await mockAuthentication(page)
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
  expect([404, 503]).toContain(unavailableApi.status())
  expect(unavailableApi.headers()['content-type']).toContain('application/json')
  const rejected = await request.get('/login', {
    headers: { host: 'untrusted.example' },
  })
  expect(rejected.status()).toBe(400)
})
