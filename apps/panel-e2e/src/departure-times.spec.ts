import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('departure-time company routes preserve the permission gate and truthful bounded-list controls', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      !/^Failed to load resource: the server responded with a status of (401|503) /.test(
        message.text(),
      )
    )
      errors.push(message.text())
  })
  await mockAuthentication(page)
  let requests = 0
  await page.route('**/api/v1/shiftTimes**', route => {
    requests++
    return route.fulfill({ status: 500, json: {} })
  })
  await page.route('**/api/v1/companys/2', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 2,
          name: 'Private departure company',
          companyTypeId: null,
          companyTypeName: null,
          cityId: null,
          provinceId: null,
          address: null,
          postalCode: null,
          lat: 0,
          lng: 0,
          mobileNumber: null,
          phoneNumber: null,
          faxNumber: null,
          description: null,
          companyLogo: null,
        },
      },
    }),
  )
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/2/shift-time')
  await expect(page).toHaveURL(/\/client\/2\/departure-times$/)
  await expect(page.getByRole('heading', { name: 'Departure times', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Departure-time access is not enabled')
  await expect(
    page.getByText('This list is not guaranteed to be complete.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Table pages', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Create departure time', exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('searchbox', { name: 'Departure-time name', exact: true }).fill('Morning')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/name=Morning/)
  for (const dir of ['rtl', 'ltr']) {
    await page.evaluate(direction => document.documentElement.setAttribute('dir', direction), dir)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await page.getByRole('button', { name: 'Search', exact: true }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44)
  }
  const reload = await page.reload()
  if (!reload) throw new Error('Reload returned no document')
  expect(await reload.text()).not.toContain('Private departure company')
  await expect(page.getByRole('heading', { name: 'Departure times', exact: true })).toBeVisible()
  for (const path of ['new', '3/edit']) {
    await page.goto('/client/2/departure-times/' + path)
    await expect(page.getByRole('alert')).toContainText(
      'You do not have access to edit departure times',
    )
    await expect(page.locator('lib-departure-time-editor form')).toHaveCount(0)
  }
  await page.goto('/client/2/shift-time/detail/3')
  await expect(page).toHaveURL(/\/client\/2\/departure-times\/3\/edit$/)
  await expect(page.getByRole('alert')).toContainText(
    'You do not have access to edit departure times',
  )
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/client/2/departure-times/3/edit')
  await expect(page).toHaveURL(/\/login/)
  expect(requests).toBe(0)
  expect(errors).toEqual([])
})
