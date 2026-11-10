// Controlled upstream for browser acceptance. Never used by application deployment.
import express from 'express'
import { createHmac, randomBytes } from 'node:crypto'

const app = express()
app.use(express.json())
const identity = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/'
const role = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const issued = new Set<string>()
const refreshTokens = new Set<string>()
let refreshCount = 0
const key = randomBytes(32)
function issue() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      [`${identity}nameidentifier`]: 'browser-fixture-user',
      [`${identity}name`]: 'Example',
      [`${identity}surname`]: 'User',
      [role]: ['Admin', 'Client'],
      sid: '1',
      companyId: '1',
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: randomBytes(8).toString('hex'),
    }),
  ).toString('base64url')
  const input = `${header}.${payload}`
  const token = `${input}.${createHmac('sha256', key).update(input).digest('base64url')}`
  const refreshToken = randomBytes(32).toString('base64url')
  issued.add(token)
  refreshTokens.add(refreshToken)
  return {
    code: '2000',
    result: {
      token,
      refreshToken,
      refreshTokenExpiryTime: new Date(Date.now() + 3600000).toISOString(),
    },
  }
}
app.post('/api/tokens/get-by-email', (req, res) => {
  if (
    req.get('tenant') !== 'example' ||
    req.body.email !== 'example@example.test' ||
    req.body.password !== 'example-password'
  ) {
    res.status(401).json({ messages: ['Invalid fixture credentials.'] })
    return
  }
  res.json(issue())
})
app.post('/api/tokens/refresh', (req, res) => {
  if (req.get('tenant') !== 'example' || !refreshTokens.delete(req.body.refreshToken)) {
    res.status(401).json({})
    return
  }
  refreshCount++
  res.json(issue())
})
app.get('/api/personal/permissions', (req, res) => {
  if (!issued.has((req.get('Authorization') ?? '').replace(/^Bearer /, ''))) {
    res.status(401).json({})
    return
  }
  res.json(['fixture.read'])
})
app.get('/api/personal/logout', (_req, res) => res.json({ code: '2000', result: 'Signed out' }))
// Test control endpoints exist only in this isolated loopback fixture process.
app.post('/__test/reject-access', (_req, res) => {
  issued.clear()
  res.json({ refreshCount })
})
app.get('/__test/auth-stats', (_req, res) => res.json({ refreshCount }))
app.listen(Number(process.env['AUTH_FIXTURE_PORT'] ?? 5101), '127.0.0.1', () =>
  console.log('Auth upstream fixture ready'),
)
