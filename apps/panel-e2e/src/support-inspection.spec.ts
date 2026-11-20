import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const company = {
  id: 2,
  name: 'Feature test company',
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
}

async function signIn(
  page: import('@playwright/test').Page,
  roles: readonly string[] = ['Admin', 'Client'],
) {
  await mockAuthentication(page, roles)
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
}

function watchErrors(page: import('@playwright/test').Page, errors: string[]) {
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
}

async function setPanelLanguage(
  page: import('@playwright/test').Page,
  from: 'fa' | 'en',
  to: 'fa' | 'en',
) {
  await page
    .getByRole('button', { name: from === 'fa' ? 'شخصی‌سازی پوسته' : 'Customize theme' })
    .click()
  await page.getByLabel(from === 'fa' ? 'زبان' : 'Language').selectOption(to)
  await expect(page.locator('html')).toHaveAttribute('dir', to === 'fa' ? 'rtl' : 'ltr')
  await page.getByRole('button', { name: to === 'fa' ? 'بستن' : 'Close' }).click()
}

test('Support panel loads selected-company request, exposes replies only, and remains usable on RTL mobile', async ({
  page,
}) => {
  const errors: string[] = []
  watchErrors(page, errors)
  await signIn(page)
  const searches: unknown[] = []
  const replies: unknown[] = []
  let releaseReply!: () => void
  let resolveReplyStarted!: () => void
  const replyGate = new Promise<void>(resolve => {
    releaseReply = resolve
  })
  const replyStarted = new Promise<void>(resolve => {
    resolveReplyStarted = resolve
  })
  let messageReads = 0
  let answered = false
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/support**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/search')) {
      searches.push(route.request().postDataJSON())
      return route.fulfill({
        json: envelope({
          list: [
            {
              id: 55,
              companyId: 2,
              supportTypeId: 2,
              supportTypeName: 'User ticket',
              personId: 31,
              fullName: 'Passenger One',
              mobileNumber: '09120000031',
              requestDate: '2026-11-14T08:00:00',
              subject: 'Cannot open the app',
              isAnswered: answered,
            },
          ],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      })
    }
    if (url.pathname.endsWith('/messages') && route.request().method() === 'POST') {
      replies.push(route.request().postDataJSON())
      answered = true
      resolveReplyStarted()
      await replyGate
      return route.fulfill({ json: envelope(7001) })
    }
    if (url.pathname.endsWith('/55/messages')) {
      messageReads++
      return route.fulfill({
        json: envelope([
          { body: 'The app closes after sign in.', isAnswer: false },
          ...(answered ? [{ body: 'Please update and try again.', isAnswer: true }] : []),
        ]),
      })
    }
    if (url.pathname.endsWith('/55') && route.request().method() === 'GET')
      return route.fulfill({
        json: envelope({
          id: 55,
          companyId: 2,
          supportTypeId: 2,
          supportTypeName: 'User ticket',
          personId: 31,
          mobileNumber: '09120000031',
          requestDate: '2026-11-14T08:00:00',
          subject: 'Cannot open the app',
          isAnswered: answered,
          caseFile: [],
        }),
      })
    return route.fulfill({ status: 404, json: { messages: ['Not found'] } })
  })

  await page.goto('/client/2/support')
  await expect(
    page.getByRole('heading', { name: /درخواست‌های پشتیبانی|Support requests/ }),
  ).toBeVisible()
  await expect(page.getByText('Cannot open the app', { exact: true })).toBeVisible()
  await expect.poll(() => searches.length).toBe(1)
  expect(searches[0]).toMatchObject({ companyId: 2, supportTypeId: 2, pageNumber: 1, pageSize: 10 })
  await setPanelLanguage(page, 'fa', 'fa')
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await setPanelLanguage(page, 'fa', 'en')
  expect(await page.locator('table').evaluate(table => getComputedStyle(table).direction)).toBe(
    'ltr',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await setPanelLanguage(page, 'en', 'fa')
  const openRequest = page.getByRole('link', { name: /مشاهده درخواست|Open request/ })
  await openRequest.focus()
  await expect(openRequest).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Cannot open the app' })).toBeVisible()
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1280, height: 812 })
  await expect(page.getByText('The app closes after sign in.', { exact: true })).toBeVisible()
  await expect(page.getByText(/زمان و ترتیب پیام‌ها|timestamps and ordering/)).toBeVisible()
  await expect(page.getByRole('link', { name: /حذف|Delete/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /ایجاد درخواست|Create request/ })).toHaveCount(0)
  const reply = page.getByRole('textbox', { name: 'پیام' })
  await reply.fill('Please update and try again.')
  const sendReply = page.getByRole('button', { name: /ارسال پاسخ|Send response/ })
  await sendReply.click()
  await replyStarted
  await expect(page.locator('form button[type=submit]')).toHaveAttribute('disabled', 'true')
  releaseReply()
  await expect(page.getByText('Please update and try again.', { exact: true })).toBeVisible()
  expect(replies).toEqual([{ supportId: 55, body: 'Please update and try again.' }])
  expect(messageReads).toBeGreaterThanOrEqual(2)
  expect(errors).toEqual([])
})

test('Support operator cannot search a company outside its authenticated scope', async ({
  page,
}) => {
  await mockAuthentication(page, ['Operator', 'Client'])
  let supportReads = 0
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/support/search', route => {
    supportReads++
    return route.fulfill({
      json: envelope({
        list: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/2/support')
  await expect(page.getByRole('alert')).toContainText(/اجازه مشاهده|not authorized/i)
  expect(supportReads).toBe(0)
})

test('Support distinguishes an empty company list from an empty successful result', async ({
  page,
}) => {
  await signIn(page)
  let searchCalls = 0
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/support**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/search')) {
      searchCalls++
      return route.fulfill({
        json: envelope({
          list: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      })
    }
    return route.fulfill({ status: 404, json: { messages: ['Not found'] } })
  })
  await page.goto('/client/2/support')
  await expect(page.getByRole('status')).toContainText(/درخواستی با این فیلترها|No requests match/)
  expect(searchCalls).toBe(1)
})

test('Support renders a missing request as not found and does not offer a reply', async ({
  page,
}) => {
  await signIn(page)
  let detailCalls = 0
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/support/404', route => {
    detailCalls++
    return route.fulfill({ status: 404, json: { messages: ['Not found'] } })
  })
  await page.route('**/api/v1/support/404/messages', route =>
    route.fulfill({ status: 404, json: { messages: ['Not found'] } }),
  )
  await page.goto('/client/2/support/404')
  await expect(page.getByRole('alert')).toContainText(/درخواست یافت نشد|request was not found/i)
  expect(detailCalls).toBe(1)
  await expect(page.getByRole('button', { name: /ارسال پاسخ|Send response/ })).toHaveCount(0)
})

test('Inspection access is denied to non-Admin/Manager roles before requests', async ({ page }) => {
  await mockAuthentication(page, ['Operator', 'Client'])
  let inspectionCalls = 0
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/inspections**', async route => {
    inspectionCalls++
    return route.fulfill({ json: envelope([]) })
  })
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/2/inspections')
  await expect(page.getByRole('alert')).toContainText(/دسترسی مدیر یا سرپرست|Admin or Manager/i)
  expect(inspectionCalls).toBe(0)
  await expect(
    page.getByRole('navigation', { name: 'ناوبری شرکت' }).getByRole('link', { name: 'بازرسی‌ها' }),
  ).toHaveCount(0)
})

test('Inspection list, visit insert and append-only maintenance forms use the backend contract on mobile RTL', async ({
  page,
}) => {
  const errors: string[] = []
  watchErrors(page, errors)
  await signIn(page)
  const searches: unknown[] = []
  const drivers: unknown[] = []
  const vehicles: unknown[] = []
  const visits: unknown[] = []
  const statusWrites: unknown[] = []
  const defects: { dueDate: string; description: string }[] = []
  const actions: { completedAt: string; description: string }[] = []
  let releaseDefect!: () => void
  let resolveDefectStarted!: () => void
  const defectGate = new Promise<void>(resolve => {
    releaseDefect = resolve
  })
  const defectStarted = new Promise<void>(resolve => {
    resolveDefectStarted = resolve
  })
  const inspection = {
    id: 13,
    inspectorId: 5,
    inspectorName: 'Inspector One',
    inspectionDate: '2026-11-15T00:00:00',
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
    defects: defects.map((item, index) => ({ id: index + 1, inspectionVisitId: 13, ...item })),
    correctiveActions: actions.map((item, index) => ({
      id: index + 1,
      inspectionVisitId: 13,
      ...item,
    })),
  }
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(company) }))
  await page.route('**/api/v1/inspections**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/search')) {
      searches.push(route.request().postDataJSON())
      return route.fulfill({
        json: envelope([
          {
            id: 12,
            inspectorId: 5,
            inspectorName: 'Inspector One',
            inspectionDate: '2026-11-14T00:00:00',
            driverId: 23,
            driverName: 'Driver One',
            vehicleId: 7,
            carPlate: '12345678',
            statusTypeId: statusWrites.length ? 'Approved' : 'Pending approval',
          },
        ]),
      })
    }
    if (path.endsWith('/defects')) {
      defects.push(route.request().postDataJSON())
      resolveDefectStarted()
      await defectGate
      return route.fulfill({ json: envelope(51) })
    }
    if (path.endsWith('/corrective-actions')) {
      actions.push(route.request().postDataJSON())
      return route.fulfill({ json: envelope(52) })
    }
    if (path.endsWith('/status')) {
      statusWrites.push(route.request().postDataJSON())
      return route.fulfill({ json: envelope(true) })
    }
    if (path === '/api/v1/inspections' && route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      visits.push(body)
      Object.assign(inspection, body, { id: 13, inspectorId: 5, inspectorName: 'Inspector One' })
      return route.fulfill({ json: envelope(13) })
    }
    if (path.endsWith('/13')) {
      const result = {
        ...inspection,
        defects: defects.map((item, index) => ({ id: index + 1, inspectionVisitId: 13, ...item })),
        correctiveActions: actions.map((item, index) => ({
          id: index + 1,
          inspectionVisitId: 13,
          ...item,
        })),
      }
      return route.fulfill({ json: envelope(result) })
    }
    return route.fulfill({ status: 404, json: { messages: ['Not found'] } })
  })
  await page.route('**/api/v1/drivers/search', route => {
    const body = route.request().postDataJSON()
    drivers.push(body)
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
    vehicles.push(body)
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
            companyName: 'Feature test company',
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

  await page.goto('/client/2/inspections')
  await expect(page.getByRole('heading', { name: 'بازرسی‌ها', exact: true })).toBeVisible()
  await expect(page.getByText(/نتایج بر اساس شرکت انتخاب‌شده فیلتر نمی‌شوند/)).toBeVisible()
  await expect(page.getByText('Pending approval', { exact: true })).toBeVisible()
  expect(searches[0]).toEqual({ pageNumber: 1, pageSize: 25, orderBy: 'InspectionDate DESC' })
  await setPanelLanguage(page, 'fa', 'fa')
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await setPanelLanguage(page, 'fa', 'en')
  expect(await page.locator('table').evaluate(table => getComputedStyle(table).direction)).toBe(
    'ltr',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await setPanelLanguage(page, 'en', 'fa')
  await page.getByRole('link', { name: 'ثبت بازرسی', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ثبت بازدید بازرسی' })).toBeVisible()
  await expect.poll(() => drivers.length).toBe(1)
  await expect.poll(() => vehicles.length).toBe(1)
  expect(drivers[0]).toMatchObject({ companyId: 2, pageNumber: 1, pageSize: 50 })
  expect(vehicles[0]).toMatchObject({ companyId: 2, pageNumber: 1, pageSize: 50 })
  await page.getByLabel('انتخاب راننده').selectOption('23')
  await page.getByLabel('انتخاب وسیله نقلیه').selectOption('7')
  await page.getByLabel('تاریخ بازرسی').fill('2026-11-15')
  await page.getByLabel(/توضیحات/).fill('Initial inspection')
  for (const fieldset of await page.locator('fieldset').all())
    await fieldset.locator('input[type=radio]').first().check()
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click()
  await expect(page).toHaveURL(/\/client\/2\/inspections\/13$/)
  await expect(page.getByRole('heading', { name: 'جزئیات بازرسی #13' })).toBeVisible()
  expect(visits).toHaveLength(1)
  expect(visits[0]).toMatchObject({
    id: 0,
    inspectionDate: '2026-11-15',
    driverId: 23,
    vehicleId: 7,
    description: 'Initial inspection',
  })
  expect(
    Object.keys(visits[0] as object).filter(
      key => key.endsWith('Condition') || key.startsWith('has'),
    ).length,
  ).toBe(12)
  const statusForm = page.locator('#inspection-status-form')
  await statusForm.locator('select').selectOption('3')
  await statusForm.locator('#inspection-status-confirmed').check()
  await statusForm.getByRole('button', { name: 'ثبت وضعیت', exact: true }).click()
  await expect(page.getByRole('status')).toContainText(/درخواست وضعیت پذیرفته شد/)
  expect(statusWrites).toEqual([{ id: 13, statusTypeId: 3 }])
  await expect.poll(() => searches.length).toBe(2)

  const defectForm = page.locator('#inspection-defect-form')
  await defectForm.locator('input[type=date]').fill('2026-11-20')
  await defectForm.locator('textarea').fill('Replace tire')
  const saveDefect = defectForm.getByRole('button', { name: 'ذخیره', exact: true })
  await saveDefect.click()
  await defectStarted
  await expect(defectForm.locator('button[type=submit]')).toHaveAttribute('disabled', 'true')
  await expect(defectForm.locator('textarea')).toBeDisabled()
  releaseDefect()
  await expect(page.getByText('Replace tire', { exact: true })).toBeVisible()
  const actionForm = page.locator('#inspection-action-form')
  await actionForm.locator('input[type=date]').fill('2026-11-21')
  await actionForm.locator('textarea').fill('Tire replaced')
  await actionForm.getByRole('button', { name: 'ذخیره', exact: true }).click()
  await expect(page.getByText('Tire replaced', { exact: true })).toBeVisible()
  expect(defects).toEqual([
    { id: 0, inspectionVisitId: 13, dueDate: '2026-11-20', description: 'Replace tire' },
  ])
  expect(actions).toEqual([
    { id: 0, inspectionVisitId: 13, completedAt: '2026-11-21', description: 'Tire replaced' },
  ])
  expect(errors).toEqual([])
})
