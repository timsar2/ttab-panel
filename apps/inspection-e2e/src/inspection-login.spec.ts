import { expect, test, type Page } from '@playwright/test'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })

function sessionFor(roles: readonly string[]) {
  return {
    expiresAt: Date.now() + 60 * 60 * 1000,
    user: {
      id: 'inspector-user',
      businessEntityId: 70000,
      companyId: 4,
      firstName: 'Test',
      lastName: 'Inspector',
      roles,
    },
  }
}

async function mockCookieSession(page: Page, roles: readonly string[]) {
  await page.route('**/api/auth/session', route =>
    route.fulfill({ status: 401, json: { messages: ['No session'] } }),
  )
  await page.route('**/api/auth/login', route =>
    route.fulfill({ status: 200, json: sessionFor(roles) }),
  )
}

async function changeLanguage(page: Page, from: 'fa' | 'en', to: 'fa' | 'en') {
  await page
    .getByRole('button', { name: from === 'fa' ? 'شخصی‌سازی پوسته' : 'Customize theme' })
    .click()
  await page.getByLabel(from === 'fa' ? 'زبان' : 'Language').selectOption(to)
  await expect(page.locator('html')).toHaveAttribute('dir', to === 'fa' ? 'rtl' : 'ltr')
  await page.getByRole('button', { name: to === 'fa' ? 'بستن' : 'Close' }).click()
}

test('serves shared login and creates/reads an Inspector visit with controlled auth/API fixtures', async ({
  page,
}) => {
  await mockCookieSession(page, ['Inspector'])
  const driverSearches: unknown[] = []
  const vehicleSearches: unknown[] = []
  const createdVisits: unknown[] = []
  let releaseVisitSave!: () => void
  let resolveVisitSaveStarted!: () => void
  const visitSaveGate = new Promise<void>(resolve => {
    releaseVisitSave = resolve
  })
  const visitSaveStarted = new Promise<void>(resolve => {
    resolveVisitSaveStarted = resolve
  })
  const visit = {
    id: 88,
    inspectorId: 70000,
    inspectorName: 'Test Inspector',
    inspectionDate: '2026-11-19T00:00:00',
    driverId: 23,
    driverName: 'Driver One',
    vehicleId: 7,
    carPlate: '12345678',
    description: 'Initial inspection',
    tiresCondition: true,
    lightsCondition: true,
    seatsCondition: true,
    hasSeatBelt: true,
    heaterCondition: true,
    airConditionerCondition: true,
    hasFirstAidKit: true,
    hasFireExtinguisher: true,
    hasTurnSignals: true,
    wipersCondition: true,
    windowsCondition: true,
    hasSafetyVestAndWarningTriangle: true,
    defects: [],
    correctiveActions: [],
  }

  await page.route('**/api/v1/drivers/search', route => {
    const body = route.request().postDataJSON()
    driverSearches.push(body)
    return route.fulfill({
      json: envelope({
        list: [
          {
            id: 23,
            fullName: 'Driver One',
            nationalId: '0012345678',
            mobileNumber: '09120000023',
            profileImage: null,
            driverLicenceLevelName: '2',
          },
        ],
        pagination: {
          currentPage: body.pageNumber,
          pageSize: body.pageSize,
          totalCount: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    })
  })
  await page.route('**/api/v1/vehicle/search', route => {
    const body = route.request().postDataJSON()
    vehicleSearches.push(body)
    return route.fulfill({
      json: envelope({
        list: [
          {
            id: 7,
            driverId: 23,
            fullName: 'Driver One',
            carTypeName: 'Bus',
            carImage: null,
            carPlate: '12345678',
            produnctionYear: 2018,
            capacity: 2,
            companyName: 'Test Company',
            companyTypeName: 'Client',
          },
        ],
        pagination: {
          currentPage: body.pageNumber,
          pageSize: body.pageSize,
          totalCount: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    })
  })
  await page.route('**/api/v1/inspections**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/88') && route.request().method() === 'GET')
      return route.fulfill({ json: envelope(visit) })
    if (path === '/api/v1/inspections' && route.request().method() === 'POST') {
      createdVisits.push(route.request().postDataJSON())
      resolveVisitSaveStarted()
      await visitSaveGate
      return route.fulfill({ json: envelope(88) })
    }
    return route.fulfill({ status: 404, json: { messages: ['Not found'] } })
  })

  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: /ورود به Inspection|Sign in to Inspection/ }),
  ).toBeVisible()
  await expect(page.locator('#username')).toHaveValue('')
  await expect(page.locator('#password')).toHaveValue('')
  await page.locator('#username').fill('inspector@root.com')
  await page.locator('#password').fill('fixture-password')
  await page.getByRole('button', { name: /ورود به Inspection|Sign in to Inspection/ }).click()

  await expect(page).toHaveURL(/\/inspections\/new$/)
  await expect(page.getByRole('heading', { name: /ثبت بازرسی|Register inspection/ })).toBeVisible()
  await expect.poll(() => driverSearches.length).toBe(1)
  await expect.poll(() => vehicleSearches.length).toBe(1)
  expect(driverSearches[0]).toMatchObject({ companyId: 4, pageNumber: 1, pageSize: 50 })
  expect(vehicleSearches[0]).toMatchObject({ companyId: 4, pageNumber: 1, pageSize: 50 })

  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await changeLanguage(page, 'fa', 'en')
  await expect(
    page.getByRole('heading', { name: 'Register inspection', exact: true }),
  ).toBeVisible()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).resolves.toBe(true)
  await changeLanguage(page, 'en', 'fa')

  const driverSearch = page.locator('#inspector-driver-search')
  await driverSearch.focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'جستجو', exact: true }).first()).toBeFocused()
  await page.getByRole('button', { name: 'ثبت بازدید', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(/راننده، خودرو، تاریخ/)
  expect(createdVisits).toHaveLength(0)

  await page.locator('#inspector-driver').selectOption('23')
  await page.locator('#inspector-vehicle').selectOption('7')
  await page.locator('#inspector-date').fill('2026-11-19')
  await page.locator('#inspector-description').fill('Initial inspection')
  for (const fieldset of await page.locator('fieldset').all())
    await fieldset.locator('input[type=radio]').first().check()
  await page.locator('#inspector-visit-submit').click()
  await visitSaveStarted
  await expect(page.locator('#inspector-visit-submit')).toHaveAttribute('disabled', 'true')
  releaseVisitSave()

  await expect(page).toHaveURL(/\/inspections\/88$/)
  await expect(
    page.getByRole('heading', { name: /نتیجه بازرسی #88|Inspection result #88/ }),
  ).toBeVisible()
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(createdVisits).toHaveLength(1)
  expect(createdVisits[0]).toMatchObject({
    id: 0,
    inspectionDate: '2026-11-19',
    driverId: 23,
    vehicleId: 7,
    description: 'Initial inspection',
  })
  expect(createdVisits[0]).not.toHaveProperty('inspectorId')
  expect(createdVisits[0]).not.toHaveProperty('companyId')
  expect(
    Object.keys(createdVisits[0] as object).filter(
      key => key.endsWith('Condition') || key.startsWith('has'),
    ),
  ).toHaveLength(12)
  await expect(page.locator('form')).toHaveCount(0)
})

test('redirects authenticated non-Inspector users away from Inspector forms', async ({ page }) => {
  await mockCookieSession(page, ['Admin', 'Client'])
  await page.goto('/login')
  await page.locator('#username').fill('admin@root.com')
  await page.locator('#password').fill('fixture-password')
  await page.getByRole('button', { name: /ورود به Inspection|Sign in to Inspection/ }).click()

  await expect(page).toHaveURL(/\/access-denied$/)
  await expect(page.getByRole('heading', { name: /دسترسی مجاز نیست|Access denied/ })).toBeVisible()
})
