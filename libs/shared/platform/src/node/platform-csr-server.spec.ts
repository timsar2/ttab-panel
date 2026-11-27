// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlatformCsrServer } from './platform-csr-server'

const shell = '<!doctype html><html><body><app-root></app-root></body></html>'

describe('createPlatformCsrServer', () => {
  let browserDistFolder: string

  beforeEach(async () => {
    browserDistFolder = await mkdtemp(join(tmpdir(), 'platform-csr-'))
    await writeFile(join(browserDistFolder, 'index.html'), shell)
    await writeFile(join(browserDistFolder, 'main.js'), 'console.log("CSR")')
    vi.stubEnv('AUTH_SESSION_SECRET', 'test-only-csr-session-secret-at-least-32-bytes')
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(browserDistFolder, { recursive: true, force: true })
  })

  function fixture(production = false) {
    return createPlatformCsrServer({
      appId: 'panel',
      environment: production
        ? {
            production: true,
            apiUrl: 'https://api.example.test/api',
            publicOrigin: 'https://app.example.test',
          }
        : { production: false, apiUrl: 'http://localhost:5001/api' },
      moduleUrl: import.meta.url,
      browserDistFolder,
      listen: false,
      onDiagnostic: vi.fn(),
    }).app
  }

  it('serves the unchanged CSR shell for deep links without rendering or session cookies', async () => {
    const response = await request(fixture()).get('/companies/42').set('Host', 'localhost')
    expect(response.status).toBe(200)
    expect(response.text).toBe(shell)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('serves assets but does not return HTML for missing assets or document POSTs', async () => {
    const app = fixture()
    const asset = await request(app).get('/main.js').set('Host', 'localhost')
    expect(asset.status).toBe(200)
    expect(asset.text).toContain('CSR')
    expect((await request(app).get('/missing.js').set('Host', 'localhost')).status).toBe(404)
    expect((await request(app).post('/workspace').set('Host', 'localhost')).status).toBe(404)
  })

  it('does not cache direct requests for the SPA index', async () => {
    const response = await request(fixture()).get('/index.html').set('Host', 'localhost')
    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('retains the cookie-session BFF instead of returning the SPA shell for API requests', async () => {
    const app = fixture()
    const session = await request(app).get('/api/auth/session').set('Host', 'localhost')
    expect(session.status).toBe(401)
    expect(session.headers['cache-control']).toBe('no-store')
    expect(session.headers['content-type']).toContain('application/json')
    expect((await request(app).get('/api/tokens').set('Host', 'localhost')).status).toBe(404)
  })

  it('preserves CSRF protection for login mutations', async () => {
    const response = await request(fixture())
      .post('/api/auth/login')
      .set('Host', 'localhost')
      .set('Origin', 'https://attacker.invalid')
      .set('X-Auth-Request', '1')
      .send({ username: 'test@example.test', password: 'password' })
    expect(response.status).toBe(403)
  })

  it('restricts production hosts without relying on an Angular server engine', async () => {
    const app = fixture(true)
    expect((await request(app).get('/workspace').set('Host', 'attacker.invalid')).status).toBe(400)
    const allowed = await request(app).get('/workspace').set('Host', 'app.example.test')
    expect(allowed.status).toBe(200)
    expect(allowed.text).toBe(shell)
  })
})
