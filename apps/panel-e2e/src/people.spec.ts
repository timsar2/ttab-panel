import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('people company route stays private and fails closed while read permissions are unapproved', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    // The auth fixture intentionally rejects the initial session and remote logout.
    if (
      message.type() === 'error' &&
      !/^Failed to load resource: the server responded with a status of (401|503) /.test(
        message.text(),
      )
    )
      errors.push(message.text())
  })
  await mockAuthentication(page)
  let peopleRequests = 0
  await page.route('**/api/users/**', route => {
    peopleRequests++
    return route.fulfill({ status: 500, json: { unexpected: true } })
  })
  await page.route('**/api/v1/companys/*', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: Number(route.request().url().split('/').pop()),
          name: 'Scoped company',
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
  await page.goto('/client/2/people')
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('People access is not enabled')
  await expect(page.getByRole('searchbox', { name: 'Full name', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Full name', exact: true }).fill('Search draft')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/name=Search%20draft/)
  await expect(page.getByRole('alert')).toContainText('People access is not enabled')
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await page.getByRole('button', { name: 'Search', exact: true }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44)
    expect(
      (
        await page
          .getByRole('combobox', { name: 'Shift assignment filter', exact: true })
          .boundingBox()
      )?.height,
    ).toBeGreaterThanOrEqual(44)
  }
  const reload = await page.reload()
  if (!reload) throw new Error('Reload returned no document response')
  const html = await reload.text()
  expect(html).not.toContain('Search draft')
  expect(html).not.toContain('Scoped company')
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/client/2/people')
  await expect(page).toHaveURL(/\/login/)
  expect(peopleRequests).toBe(0)
  expect(errors).toEqual([])
})
