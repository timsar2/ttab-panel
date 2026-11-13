import { environment } from '../environments/environment'

export const panelConfig = {
  apiUrl: '/api',
  mode: 'cookie',
  tenant: 'root',
  loginUrl: '/login',
  afterLoginUrl: '/workspace',
  brandName: 'Panel',
  neshanMapApiKey: environment.neshanMapApiKey,
} as const
