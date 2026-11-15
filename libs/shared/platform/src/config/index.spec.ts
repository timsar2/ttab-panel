import {
  PLATFORM_API_BASE_URL,
  PLATFORM_API_URL,
  PLATFORM_BASE_URL,
  PLATFORM_DEV_API_URL,
  PLATFORM_DEV_BASE_URL,
  sharedDevelopmentEnvironment,
  sharedProductionEnvironment,
} from './index'

describe('shared platform environment config', () => {
  it('uses a single base URL per environment with API derived from it', () => {
    expect(PLATFORM_DEV_BASE_URL).toBe('https://localhost:5001')
    expect(PLATFORM_DEV_API_URL).toBe('https://localhost:5001/api')
    expect(PLATFORM_BASE_URL).toBe('https://api.ttabline.com')
    expect(PLATFORM_API_BASE_URL).toBe(PLATFORM_BASE_URL)
    expect(PLATFORM_API_URL).toBe('https://api.ttabline.com/api')
  })

  it('exposes shared dev/prod environment objects for all apps', () => {
    expect(sharedDevelopmentEnvironment).toMatchObject({
      production: false,
      baseUrl: PLATFORM_DEV_BASE_URL,
      apiUrl: PLATFORM_DEV_API_URL,
    })
    expect(sharedProductionEnvironment).toMatchObject({
      production: true,
      baseUrl: PLATFORM_BASE_URL,
      apiUrl: PLATFORM_API_URL,
    })
  })
})
