export const PLATFORM_BASE_URL = 'https://api.ttabline.com'
export const PLATFORM_DEV_BASE_URL = 'https://localhost:5001'

export const PLATFORM_PUBLIC_ORIGIN = 'https://app.ttabline.com'
export const PLATFORM_DEV_PUBLIC_ORIGIN = 'http://localhost:4200'

export const PLATFORM_API_URL = `${PLATFORM_BASE_URL}/api`
export const PLATFORM_DEV_API_URL = `${PLATFORM_DEV_BASE_URL}/api`

export const developmentEnvironment = {
  production: false,
  baseUrl: PLATFORM_DEV_BASE_URL,
  apiUrl: PLATFORM_DEV_API_URL,
  publicOrigin: PLATFORM_DEV_PUBLIC_ORIGIN,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.287e03a9ce1a44eab859a6c923e632f9',
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const

export const productionEnvironment = {
  production: true,
  baseUrl: PLATFORM_BASE_URL,
  apiUrl: PLATFORM_API_URL,
  publicOrigin: PLATFORM_PUBLIC_ORIGIN,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.4ab6e42819b9452a8047910ad36e3668',
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const
