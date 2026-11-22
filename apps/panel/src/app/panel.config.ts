import { environment } from '../environments/environment'

export const panelConfig = {
  apiUrl: '/api',
  afterLoginUrl: '/companies',
  brandName: 'Panel',
  neshanServiceApiKey: environment.neshanServiceApiKey,
  neshanMapApiKey: environment.neshanMapApiKey,
} as const
