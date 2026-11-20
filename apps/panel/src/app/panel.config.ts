import { environment } from '../environments/environment'

export const panelConfig = {
  apiUrl: '/api',
  afterLoginUrl: '/workspace',
  brandName: 'Panel',
  neshanServiceApiKey: environment.neshanServiceApiKey,
  neshanMapApiKey: environment.neshanMapApiKey,
} as const
