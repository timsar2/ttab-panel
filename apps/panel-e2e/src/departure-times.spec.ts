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
  const listBodies: unknown[] = []
  const detailUrls: string[] = []
  const saveBodies: unknown[] = []
  await page.route('**/api/v1/shiftTimes**', route => {
    requests++
    const url = new URL(route.request().url())
    if (route.request().method() === 'GET') {
      detailUrls.push(route.request().url())
      return route.fulfill({
        json: {
          code: '2000',
          massage: 'Success',
          result: {
            companyId: 2,
            name: 'سرویس بعد ازظهر',
            shiftTime: '16:30:00',
            id: 3,
          },
        },
      })
    }
    if (url.pathname.endsWith('/set-shift-time')) {
      const body = route.request().postDataJSON()
      saveBodies.push(body)
      return route.fulfill({
        json: {
          code: '2000',
          massage: 'Success',
          result: { ...(body as object), shiftTime: '16:30:00' },
        },
      })
    }
    listBodies.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: [{ id: 3, companyId: 2, name: 'Morning service', shiftTime: '07:30:00' }],
      },
    })
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
  await expect(page).toHaveURL(/\/client\/2\/shift-time$/)
  await expect(page.getByRole('heading', { name: 'Departure times', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Morning service' })).toBeVisible()
  await expect.poll(() => requests).toBe(1)
  expect(listBodies[0]).toEqual({ companyId: 2, name: null })
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
  await expect.poll(() => requests).toBe(2)
  expect(listBodies[1]).toEqual({ companyId: 2, name: 'Morning' })
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
  await expect.poll(() => requests).toBe(3)
  for (const path of ['new', '3/edit']) {
    await page.goto('/client/2/departure-times/' + path)
    await expect(page.getByRole('alert')).toContainText(
      'You do not have access to edit departure times',
    )
    await expect(page.locator('lib-departure-time-editor form')).toHaveCount(0)
  }
  await page.goto('/client/2/shift-time/detail/3')
  await expect(page).toHaveURL(/\/client\/2\/shift-time\/3\/edit$/)
  await expect(page.locator('#departure-name')).toHaveValue('سرویس بعد ازظهر')
  await expect(page.locator('#departure-time')).toHaveValue('16:30:00')
  expect(new URL(detailUrls[0]).pathname).toBe('/api/v1/shiftTimes/3')
  await page.locator('#departure-name').fill('Edited afternoon service')
  await page.getByRole('button', { name: 'Save departure time', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Departure time saved.')
  expect(saveBodies).toEqual([
    {
      id: 3,
      companyId: 2,
      name: 'Edited afternoon service',
      shiftTime: '16:30:00',
    },
  ])
  await page.getByRole('button', { name: /Sign out|خروج/ }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/client/2/departure-times/3/edit')
  await expect(page).toHaveURL(/\/login/)
  expect(requests).toBe(5)
  expect(errors).toEqual([])
})
