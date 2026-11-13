export const panelConfig = {
  apiUrl: '/api',
  mode: 'cookie',
  tenant: 'root',
  loginUrl: '/login',
  afterLoginUrl: '/workspace',
  brandName: 'Panel',
  // Supply an origin-restricted Neshan Web Map key through deployment configuration.
  neshanMapApiKey: '',
} as const
