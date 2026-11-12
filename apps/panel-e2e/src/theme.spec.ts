import { expect, test, type Page } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

const rootToken = (page: Page, name: string) =>
  page.evaluate(key => document.documentElement.style.getPropertyValue(key).trim(), name)

async function textContrast(page: Page, selector: string): Promise<number> {
  return page.evaluate(selector => {
    const node = document.querySelector(selector)
    if (!node) throw new Error(`Missing contrast target: ${selector}`)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas context unavailable')
    const channels = (color: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      return context.getImageData(0, 0, 1, 1).data
    }
    let background = channels('white')
    for (let parent: Element | null = node; parent; parent = parent.parentElement) {
      const candidate = channels(getComputedStyle(parent).backgroundColor)
      if (candidate[3] === 255) {
        background = candidate
        break
      }
    }
    const luminance = (rgb: Uint8ClampedArray) => {
      const linear = [...rgb].slice(0, 3).map(value => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
    }
    const foreground = luminance(channels(getComputedStyle(node).color))
    const backdrop = luminance(background)
    return (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05)
  }, selector)
}

async function openEnglishSettings(page: Page) {
  await page.getByRole('button', { name: 'Customize theme', exact: true }).click()
  // Sheet content is fixed-positioned inside CDK's size-independent container.
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  await expect(page.getByRole('heading', { name: 'Theme settings', exact: true })).toBeVisible()
}

test('Spartan transport sidebar follows theme modes and opens an accessible mobile menu', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mockAuthentication(page)
  await page.goto('/login')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await page.getByLabel('Username', { exact: true }).fill(credentials.username)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in to panel' }).click()
  await expect(page).toHaveURL(/\/workspace$/)
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const menu = page.locator('hlm-sidebar nav')
  await expect(menu.getByRole('link', { name: 'Workspace', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(menu.getByRole('link', { name: 'Companies', exact: true })).toHaveAttribute(
    'href',
    '/companies',
  )
  await expect(
    menu.getByRole('button', { name: 'Vehicles: Not implemented yet', exact: true }),
  ).toBeDisabled()
  await expect(
    menu.getByRole('button', { name: 'People: Choose a company first', exact: true }),
  ).toBeDisabled()
  for (const style of ['full', 'mini', 'compact', 'modern', 'icon-hover']) {
    await openEnglishSettings(page)
    await page.getByRole('combobox', { name: 'Sidebar style', exact: true }).selectOption(style)
    await page.getByRole('button', { name: 'Sidebar background: Color 14', exact: true }).click()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-style', style)
    await expect(menu.getByRole('link', { name: 'Companies', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await openEnglishSettings(page)
  await page.getByRole('combobox', { name: 'Layout', exact: true }).selectOption('horizontal')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(menu.getByRole('link', { name: 'Companies', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.locator('button[hlmSidebarTrigger]').click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Companies', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog').locator('nav ul')).toHaveCSS('flex-direction', 'column')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1280, height: 720 })
  await openEnglishSettings(page)
  await page.getByRole('combobox', { name: 'Layout', exact: true }).selectOption('vertical')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-sidebar-style', 'icon-hover')
  await page.setViewportSize({ width: 375, height: 812 })
  const trigger = page.locator('button[hlmSidebarTrigger]')
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'شرکت‌ها', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog').locator('[data-nav-label]').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('dialog').getByRole('link', { name: 'فضای کاری', exact: true }).click()
  await expect(page).toHaveURL(/\/workspace$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('customizes live tokens, persists after reload, removes custom overrides, and resets', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await openEnglishSettings(page)
  await page.getByRole('combobox', { name: 'Theme version', exact: true }).selectOption('dark')
  await page.getByRole('button', { name: 'Primary color: Color 14', exact: true }).click()
  await page.getByRole('combobox', { name: 'Typography', exact: true }).selectOption('tahoma')
  await page.getByRole('combobox', { name: 'Corner radius', exact: true }).selectOption('16px')
  await page.getByRole('combobox', { name: 'Field density', exact: true }).selectOption('compact')
  await page.getByRole('combobox', { name: 'Shadows', exact: true }).selectOption('flat')
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await rootToken(page, '--primary')).toBe('#4885ed')
  expect(await rootToken(page, '--field-height')).toBe('41px')
  expect(await rootToken(page, '--shadow-lg')).toBe('none')
  await page
    .getByLabel('Custom CSS', { exact: true })
    .fill('--radius: 22px;\n--unsafe: url(https://invalid.example/);')
  expect(await rootToken(page, '--radius')).toBe('1rem')
  await expect(page.getByText('Invalid lines will be skipped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  expect(await rootToken(page, '--radius')).toBe('22px')
  expect(await rootToken(page, '--unsafe')).toBe('')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-typography', 'tahoma')
  expect(await rootToken(page, '--radius')).toBe('22px')
  await page.getByRole('button', { name: 'شخصی‌سازی پوسته', exact: true }).click()
  await page.getByLabel('CSS سفارشی', { exact: true }).fill('')
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click()
  expect(await rootToken(page, '--radius')).toBe('1rem')
  await page.getByRole('button', { name: 'بازنشانی', exact: true }).click()
  expect(await rootToken(page, '--radius')).toBe('0.125rem')
  expect(await rootToken(page, '--primary')).toBe('#ff720d')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('panel.theme.v1') || '{}'),
  )
  expect(saved.customVars).toEqual({})
  expect(saved.typography).toBe('poppins')
  await page.getByRole('button', { name: 'بستن', exact: true }).click()
  await expect(page.getByRole('button', { name: 'شخصی‌سازی پوسته', exact: true })).toBeFocused()
})

test('normalizes untrusted saved settings and opens a usable mobile RTL sheet', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() =>
    localStorage.setItem(
      'panel.theme.v1',
      JSON.stringify({
        version: 'dark',
        primary: 'url(https://invalid.example/)',
        radius: 'bad',
        typography: 'bad',
        customVars: { '--primary': 'url(https://invalid.example/)' },
      }),
    ),
  )
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  await page.getByRole('button', { name: 'شخصی‌سازی پوسته', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await rootToken(page, '--primary')).toBe('#ff720d')
  expect(await rootToken(page, '--radius')).toBe('0.125rem')
  await expect(page.getByRole('button', { name: 'ذخیره', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.getByRole('button', { name: 'بستن', exact: true }).click()
  expect(errors).toEqual([])
})

test('applies chrome, sidebar, container, and layout settings to the protected shell', async ({
  page,
}) => {
  await mockAuthentication(page)
  await page.goto('/workspace')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await openEnglishSettings(page)
  await page.getByRole('button', { name: 'Header background: Color 14', exact: true }).click()
  await page
    .getByRole('button', { name: 'Navigation header background: Color 2', exact: true })
    .click()
  await page.getByRole('button', { name: 'Sidebar background: Color 12', exact: true }).click()
  expect(
    await page
      .locator('lib-app-layout header')
      .evaluate(node => getComputedStyle(node).backgroundColor),
  ).toBe('rgb(72, 133, 237)')
  expect(
    await page.locator('.theme-brand').evaluate(node => getComputedStyle(node).backgroundColor),
  ).toBe('rgb(102, 16, 242)')
  expect(
    await page.locator('.theme-sidebar').evaluate(node => getComputedStyle(node).backgroundColor),
  ).toBe('rgb(52, 58, 64)')
  await page.getByRole('combobox', { name: 'Sidebar style', exact: true }).selectOption('mini')
  await expect
    .poll(() =>
      page
        .locator('[data-nav-label]')
        .evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === 'none')),
    )
    .toBe(true)
  await expect
    .poll(() => page.locator('.theme-sidebar').evaluate(node => node.getBoundingClientRect().width))
    .toBeCloseTo(91.2, 0)
  await page.getByRole('combobox', { name: 'Layout', exact: true }).selectOption('horizontal')
  await page.getByRole('combobox', { name: 'Content width', exact: true }).selectOption('boxed')
  expect(await page.locator('.theme-shell').evaluate(node => getComputedStyle(node).display)).toBe(
    'grid',
  )
  expect(
    await page.locator('lib-app-layout main').evaluate(node => getComputedStyle(node).maxWidth),
  ).toBe('1440px')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Workspace', exact: true })).toBeVisible()
})

test('keeps headings, helper text, and primary buttons readable with white and red presets', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  for (const version of ['light', 'dark']) {
    for (const color of [1, 5]) {
      await openEnglishSettings(page)
      await page.getByRole('combobox', { name: 'Theme version', exact: true }).selectOption(version)
      await page.getByRole('button', { name: `Primary color: Color ${color}`, exact: true }).click()
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      for (const selector of ['#login-title', '.welcome', '.brand-eyebrow', '.submit-button']) {
        expect(await textContrast(page, selector)).toBeGreaterThanOrEqual(4.5)
      }
      await page.locator('.submit-button').hover()
      await expect.poll(() => textContrast(page, '.submit-button')).toBeGreaterThanOrEqual(4.5)
    }
  }
})
