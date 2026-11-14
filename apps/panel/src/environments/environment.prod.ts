import { PLATFORM_API_BASE_URL, PLATFORM_API_URL } from '@org/platform/config'

export const environment = {
  production: true,
  baseUrl: PLATFORM_API_BASE_URL,
  baseUrlNeshan: 'https://api.neshan.org',
  neshanServiceApiKey: 'service.4ab6e42819b9452a8047910ad36e3668',
  // Public browser key; restrict it to approved production origins in Neshan.
  neshanMapApiKey: 'web.9d0587a11be14a61851377bd3e739fee',
  apiUrl: PLATFORM_API_URL,
}
