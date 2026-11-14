import { environment } from '../environments/environment'

export const panelConfig = {
  apiUrl: '/api',
  mode: 'cookie',
  tenant: 'root',
  loginUrl: '/login',
  afterLoginUrl: '/workspace',
  brandName: 'Panel',
  neshanServiceApiKey: environment.neshanServiceApiKey,
  neshanMapApiKey: environment.neshanMapApiKey,
} as const
