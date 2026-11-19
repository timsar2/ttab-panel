// Single source of truth for app environment URLs/config.
// All apps use the same base URL; API/auth endpoints are derived from it.
export const PLATFORM_BASE_URL = 'https://api.ttabline.com'
export const PLATFORM_DEV_BASE_URL = 'https://localhost:5001'

export const PLATFORM_API_URL = `${PLATFORM_BASE_URL}/api`
export const PLATFORM_DEV_API_URL = `${PLATFORM_DEV_BASE_URL}/api`

// Backward-compatible aliases.
// export const PLATFORM_API_BASE_URL = PLATFORM_BASE_URL

export const developmentEnvironment = {
  production: false,
  baseUrl: PLATFORM_DEV_BASE_URL,
  apiUrl: PLATFORM_DEV_API_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.287e03a9ce1a44eab859a6c923e632f9',
  // Public browser key; restrict it to approved development origins in Neshan.
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const

export const productionEnvironment = {
  production: true,
  baseUrl: PLATFORM_BASE_URL,
  apiUrl: PLATFORM_API_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.4ab6e42819b9452a8047910ad36e3668',
  // Public browser key; restrict it to approved production origins in Neshan.
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const

// Convenience alias for environments that don't need file-replacement selection in libs.
export const environment = developmentEnvironment
