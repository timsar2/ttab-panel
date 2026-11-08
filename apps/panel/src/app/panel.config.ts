import { environment } from '../environments/environment'

export const panelConfig = {
  apiUrl: environment.apiUrl,
  tenant: 'root',
  loginUrl: '/login',
  afterLoginUrl: '/workspace',
  brandName: 'Panel',
} as const
