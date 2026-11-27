import express, { type Express, type Request } from 'express'
import process from 'node:process'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent, fetch as undiciFetch } from 'undici'
import { createAuthBff, readAuthBffConfig, type AuthDiagnostic } from '@org/auth-data-access/node'
import type { DevelopmentEnvironment, ProductionEnvironment } from '../config'

export type PlatformCsrEnvironment =
  | Pick<DevelopmentEnvironment, 'apiUrl' | 'production' | 'publicOrigin'>
  | Pick<ProductionEnvironment, 'apiUrl' | 'production' | 'publicOrigin'>

export interface PlatformCsrOptions {
  readonly appId: string
  readonly environment: PlatformCsrEnvironment
  readonly moduleUrl: string
  readonly browserDistFolder?: string
  readonly listen?: boolean
  readonly onDiagnostic?: (diagnostic: AuthDiagnostic) => void
}

export interface PlatformCsrServer {
  readonly app: Express
}

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.some(host => host === hostname)
}

function createDevLoopbackFetch(
  apiUrl: string,
  production: boolean,
): typeof globalThis.fetch | undefined {
  if (production) return undefined

  try {
    const url = new URL(apiUrl)

    if (url.protocol !== 'https:' || !isLoopback(url.hostname)) {
      return undefined
    }
  } catch {
    return undefined
  }

  const dispatcher = new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  })

  return (...[input, init]: Parameters<typeof globalThis.fetch>) =>
    undiciFetch(
      input as Parameters<typeof undiciFetch>[0],
      {
        ...init,
        dispatcher,
      } as Parameters<typeof undiciFetch>[1],
    ) as unknown as ReturnType<typeof globalThis.fetch>
}

function resolveDevelopmentOrigin(req: Request): string {
  const host = req.get('host')

  if (!host) {
    throw new Error('Request host is required')
  }

  const url = new URL(`${req.protocol}://${host}`)

  if (
    !isLoopback(url.hostname) ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Invalid development origin')
  }

  return url.origin
}

export function createPlatformCsrServer(options: PlatformCsrOptions): PlatformCsrServer {
  const { appId, environment, moduleUrl } = options
  const { production, apiUrl } = environment

  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(appId)) {
    throw new Error('Platform CSR appId must be a lowercase URL-safe identifier.')
  }

  if (!production) {
    const api = URL.parse(apiUrl)

    if (api?.protocol === 'https:' && isLoopback(api.hostname)) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
    }
  }

  const serverDistFolder = dirname(fileURLToPath(moduleUrl))
  const browserDistFolder =
    options.browserDistFolder ?? resolve(serverDistFolder, '../../apps', appId, 'browser')

  const app = express()

  app.disable('x-powered-by')

  const allowedHosts = environment.production
    ? [new URL(environment.publicOrigin).hostname]
    : [...LOOPBACK_HOSTS]

  app.use((req, res, next) => {
    if (!allowedHosts.includes(req.hostname)) {
      return res.status(400).end()
    }

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    return next()
  })

  const onDiagnostic =
    options.onDiagnostic ??
    ((diagnostic: AuthDiagnostic) => {
      if (diagnostic.status && diagnostic.status >= 400) {
        console.warn('[auth-bff]', diagnostic)
      } else {
        console.info('[auth-bff]', diagnostic)
      }
    })

  const authFetch = createDevLoopbackFetch(apiUrl, production)

  function createAuthContext(publicOrigin: string) {
    const config = readAuthBffConfig(process.env, {
      apiUrl,
      publicOrigin,
      production,
      cookieNamespace: appId,
    })

    const bff = createAuthBff({
      config,
      fetch: authFetch,
      onDiagnostic,
    })

    return { config, bff }
  }

  const authContexts = new Map<string, ReturnType<typeof createAuthContext>>()

  function resolveAuthContext(req: Request) {
    const publicOrigin = environment.production
      ? environment.publicOrigin
      : resolveDevelopmentOrigin(req)

    const existing = authContexts.get(publicOrigin)

    if (existing) {
      return existing
    }

    if (authContexts.size >= 16) {
      throw new Error('Authentication context limit exceeded')
    }

    const context = createAuthContext(publicOrigin)

    authContexts.set(publicOrigin, context)

    return context
  }

  app.use('/api', (req, res, next) => {
    let context: ReturnType<typeof createAuthContext>

    try {
      context = resolveAuthContext(req)
    } catch {
      res.setHeader('Cache-Control', 'no-store')

      return res.status(503).json({
        messages: ['Authentication is unavailable.'],
      })
    }

    return context.bff(req, res, next)
  })

  // API misses must never fall through to the SPA document.
  app.use('/api', (_req, res) => res.status(404).json({ messages: ['Not found.'] }))

  app.use(
    express.static(browserDistFolder, {
      maxAge: 0,
      index: false,
      redirect: false,
      setHeaders(res, path) {
        if (path.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store')
      },
    }),
  )

  app.get('*', (req, res, next) => {
    if (!req.accepts('html') || (extname(req.path) && req.path !== '/index.html')) {
      return next()
    }

    res.setHeader('Cache-Control', 'no-store')
    res.sendFile(resolve(browserDistFolder, 'index.html'), error => {
      if (error) next(error)
    })
  })

  const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(moduleUrl)

  if (options.listen !== false && (isMainModule || process.env['pm_id'])) {
    const port = Number(process.env['PORT'] ?? 4000)
    const host = process.env['HOST'] ?? '127.0.0.1'

    const server = app.listen(port, host, () => {
      console.info('[platform-csr]', {
        appId,
        host,
        port,
        production,
        allowedHosts,
      })

      if (process.env['NX_READY_SIGNAL_SOCKET']) {
        void (async () => {
          try {
            const load = new Function('s', 'return import(s)') as (s: string) => Promise<{
              emitReadySignal(server: unknown): boolean
            }>

            const { emitReadySignal } = await load('@nx/js/ready-signal')

            emitReadySignal(server)
          } catch (error) {
            console.warn('[platform-csr] Nx ready signal failed', error)
          }
        })()
      }
    })
  }

  return {
    app,
  }
}
