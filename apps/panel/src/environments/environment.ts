import { PLATFORM_API_BASE_URL, PLATFORM_API_URL } from '@org/platform/config'

export const environment = {
  production: false,
  baseUrl: PLATFORM_API_BASE_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.287e03a9ce1a44eab859a6c923e632f9',
  // Public browser key; restrict it to approved development origins in Neshan.
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
  apiUrl: PLATFORM_API_URL,
}
