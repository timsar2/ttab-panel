import { expect, test } from '@playwright/test'
import { credentials } from './support/auth-fixture'

const fixtureOrigin = process.env['AUTH_FIXTURE_ORIGIN'] ?? 'http://127.0.0.1:5101'

test.describe('real cookie BFF with controlled upstream', () => {
  test.skip(
    process.env['AUTH_BFF_E2E'] !== '1',
    'Requires the SSR BFF and controlled auth-upstream.mts server.',
  )

  test('persists reload, renders authenticated SSR, hides tokens, and revokes logout', async ({
    page,
    context,
    baseURL,
  }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
    await page.getByRole('button', { name: /تغییر زبان/ }).click()
    await page.getByLabel('Username', { exact: true }).fill(credentials.username)
    await page.getByLabel('Password', { exact: true }).fill(credentials.password)
    const response = page.waitForResponse('**/api/auth/login')
    await page.getByRole('button', { name: 'Sign in to panel' }).click()
    const body = await (await response).json()
    expect(body.token).toBeUndefined()
    expect(body.refreshToken).toBeUndefined()
    await expect(page).toHaveURL(/\/workspace$/)
    await expect(page.getByText('Example User', { exact: true })).toBeVisible()
    const cookies = await context.cookies()
    const session = cookies.find(cookie => cookie.name.includes('auth-session'))
    expect(session).toBeDefined()
    expect(session?.httpOnly).toBe(true)
    expect(session?.sameSite).toBe('Lax')
    expect(session?.secure).toBe(new URL(baseURL ?? '').protocol === 'https:')
    expect(await page.evaluate(() => document.cookie)).not.toContain(session?.name)
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(stored).not.toMatch(/refreshToken|accessToken|browser-fixture-user/)
    const documentResponse = await page.reload()
    expect(documentResponse?.headers()['cache-control']).toBe('no-store')
    const html = await documentResponse?.text()
    expect(html).toContain('Example User')
    expect(html).not.toContain(credentials.password)
    expect(html).not.toMatch(/refreshToken|Bearer /)
    await expect(page.getByText('Example User', { exact: true })).toBeVisible()
    // Preferences restore after hydration; the header follows the saved language.
    await page.getByRole('button', { name: /Sign out|خروج/, exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
    const replay = await context.request.get('/api/auth/session', {
      headers: { Cookie: `${session?.name}=${session?.value}` },
    })
    expect(replay.status()).toBe(401)
    expect(errors).toEqual([])
  })

  test('rejects cross-origin mutations and token endpoint bypass', async ({ request, baseURL }) => {
    const denied = await request.post('/api/auth/login', {
      headers: { Origin: 'https://attacker.invalid', 'X-Auth-Request': '1' },
      data: credentials,
    })
    expect(denied.status()).toBe(403)
    const noHeader = await request.post('/api/auth/login', {
      headers: { Origin: new URL(baseURL ?? '').origin },
      data: credentials,
    })
    expect(noHeader.status()).toBe(403)
    expect((await request.get('/api/tokens')).status()).toBe(404)
  })

  test('recovers backend token rejection during session restoration without exposing tokens', async ({
    page,
    request,
  }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/login')
    await page.getByRole('button', { name: /تغییر زبان/ }).click()
    await page.getByLabel('Username', { exact: true }).fill(credentials.username)
    await page.getByLabel('Password', { exact: true }).fill(credentials.password)
    await page.getByRole('button', { name: 'Sign in to panel' }).click()
    await expect(page).toHaveURL(/\/workspace$/)
    const rejected = await request.post(`${fixtureOrigin}/__test/reject-access`)
    expect(rejected.status()).toBe(200)
    const before = await rejected.json()
    const restored = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
      return { status: response.status, body: await response.json() }
    })
    expect(restored.status).toBe(200)
    expect(restored.body.user.id).toBe('browser-fixture-user')
    expect(restored.body.token).toBeUndefined()
    expect(restored.body.refreshToken).toBeUndefined()
    const stats = await (await request.get(`${fixtureOrigin}/__test/auth-stats`)).json()
    expect(stats.refreshCount).toBe(before.refreshCount + 1)
    await page.reload()
    await expect(page).toHaveURL(/\/workspace$/)
    await expect(page.getByText('Example User', { exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })
})
