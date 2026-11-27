export interface SharedPlatformEnvironment {
  readonly baseUrl: string
  readonly apiUrl: string
  readonly baseUrlNeshan: string
  readonly neshanServiceApiKey: string
  readonly neshanMapApiKey: string
}

export type DevelopmentEnvironment = SharedPlatformEnvironment & {
  readonly production: false
  readonly publicOrigin?: never
}

export type ProductionEnvironment = SharedPlatformEnvironment & {
  readonly production: true
  readonly publicOrigin: string
}

export type PlatformEnvironment = DevelopmentEnvironment | ProductionEnvironment

export const PLATFORM_BASE_URL = 'https://api.ttabline.com'
export const PLATFORM_DEV_BASE_URL = 'https://api.ttabline.com' //'https://localhost:5001'

export const PLATFORM_API_URL = `${PLATFORM_BASE_URL}/api`
export const PLATFORM_DEV_API_URL = `${PLATFORM_DEV_BASE_URL}/api`

export const developmentEnvironment = {
  production: false,
  baseUrl: PLATFORM_DEV_BASE_URL,
  apiUrl: PLATFORM_DEV_API_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.287e03a9ce1a44eab859a6c923e632f9',
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const satisfies DevelopmentEnvironment

export const productionEnvironment = {
  production: true,
  baseUrl: PLATFORM_BASE_URL,
  apiUrl: PLATFORM_API_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.287e03a9ce1a44eab859a6c923e632f9',
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
} as const satisfies Omit<ProductionEnvironment, 'publicOrigin'>
