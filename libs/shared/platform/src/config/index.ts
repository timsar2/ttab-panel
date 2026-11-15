// Keep development and production upstreams shared and selected by the app environment.
export const PLATFORM_API_BASE_URL = 'https://api.ttabline.com'
export const PLATFORM_API_URL = `${PLATFORM_API_BASE_URL}/api`
// Keep local development on loopback HTTP for the Node auth BFF.
export const PLATFORM_DEV_API_BASE_URL = 'http://localhost:5000'
export const PLATFORM_DEV_API_URL = `${PLATFORM_DEV_API_BASE_URL}/api`
