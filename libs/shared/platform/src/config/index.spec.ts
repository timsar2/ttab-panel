import { PLATFORM_API_URL, PLATFORM_DEV_API_BASE_URL, PLATFORM_DEV_API_URL } from './index'

describe('environment-specific API upstreams', () => {
  it('keeps the Node BFF development upstream loopback-only and production HTTPS', () => {
    expect(PLATFORM_DEV_API_BASE_URL).toBe('http://localhost:5000')
    expect(PLATFORM_DEV_API_URL).toBe('http://localhost:5000/api')
    expect(PLATFORM_API_URL).toBe('https://api.ttabline.com/api')
  })
})
