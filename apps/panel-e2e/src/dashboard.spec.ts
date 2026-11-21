import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

const success = (result: unknown) => ({ code: '2000', massage: 'Success', result })

test('dashboard loads support once independently of trip and directions requests', async ({
  page,
}) => {
  await mockAuthentication(page)
  let supportSearches = 0
  let releaseDirections!: () => void
  const directionsPending = new Promise<void>(resolve => {
    releaseDirections = resolve
  })

  await page.route('**/api/v1/companys/1', route =>
    route.fulfill({ json: success({ id: 1, name: 'Test company' }) }),
  )
  await page.route('**/api/v1/trips/search', route =>
    route.fulfill({
      json: success({ list: [], pagination: { totalPages: 1 } }),
    }),
  )
  await page.route('**/api/v1/directions/search', async route => {
    await directionsPending
    await route.fulfill({ json: success([]) })
  })
  await page.route('**/api/v1/support/dashboard-search', route => {
    supportSearches++
    expect(route.request().postDataJSON()).toEqual({ companyId: 1, pageNumber: 1, pageSize: 100 })
    return route.fulfill({
      json: success({
        list: [{ id: 8, subject: 'Dashboard support request', requestDate: '2026-01-01' }],
        pagination: {
          currentPage: 1,
          pageSize: 100,
          totalCount: 1,
          totalPages: 1,
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
  await page.goto('/client/1/dashboard')

  await expect(page.getByText('Dashboard support request')).toBeVisible()
  expect(supportSearches).toBe(1)
  releaseDirections()
})
