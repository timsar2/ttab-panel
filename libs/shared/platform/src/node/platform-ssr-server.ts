import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node'
import express, { type Express } from 'express'
import process from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAuthBff, readAuthBffConfig } from '@org/auth-data-access/node'
import type { AuthDiagnostic } from '@org/auth-data-access/node'

export interface PlatformSsrEnvironment {
  readonly apiUrl: string
  readonly production: boolean
}

export interface PlatformSsrOptions {
  readonly appId: string
  readonly environment: PlatformSsrEnvironment
  readonly moduleUrl: string
  readonly developmentOrigin?: string
  readonly onDiagnostic?: (diagnostic: AuthDiagnostic) => void
}

export interface PlatformSsrServer {
  readonly app: Express
  readonly reqHandler: ReturnType<typeof createNodeRequestHandler>
}

export function createPlatformSsrServer(options: PlatformSsrOptions): PlatformSsrServer {
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(options.appId)) {
    throw new Error('Platform SSR appId must be a lowercase URL-safe identifier.')
  }
  const serverDistFolder = dirname(fileURLToPath(options.moduleUrl))
  const browserDistFolder = resolve(serverDistFolder, '../browser')
  const app = express()
  app.disable('x-powered-by')

  const authConfig = (() => {
    try {
      return readAuthBffConfig(process.env, {
        apiUrl: options.environment.apiUrl,
        production: options.environment.production,
        developmentOrigin:
          options.developmentOrigin ?? `http://localhost:${process.env['PORT'] || 4200}`,
        cookieNamespace: options.appId,
      })
    } catch {
      console.error(
        '[auth-bff] Authentication is disabled: configure API URL, public origin, and server-only session secret.',
      )
      return null
    }
  })()
  const authBff = authConfig
    ? createAuthBff({
        config: authConfig,
        onDiagnostic:
          options.onDiagnostic ??
          (diagnostic => {
            if (diagnostic.status && diagnostic.status >= 400)
              console.warn('[auth-bff]', diagnostic)
            else console.info('[auth-bff]', diagnostic)
          }),
      })
    : null
  const angularApp = new AngularNodeAppEngine({
    ...(authConfig ? { allowedHosts: [new URL(authConfig.publicOrigin).hostname] } : {}),
    trustProxyHeaders: false,
  })

  if (authBff) app.use('/api', authBff)
  else
    app.use('/api', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      res.status(503).json({ messages: ['Authentication is unavailable.'] })
    })

  app.use(
    express.static(browserDistFolder, {
      maxAge: 0,
      index: false,
      redirect: false,
    }),
  )
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    Promise.resolve(authBff?.resolveSession(req, res) ?? null)
      .then(authSession =>
        angularApp.handle(req, {
          authSession,
          authApiOrigin: authConfig?.publicOrigin,
        }),
      )
      .then(response => {
        if (!response) return next()
        response.headers.set('Cache-Control', 'no-store')
        return writeResponseToNodeResponse(response, res)
      })
      .catch(next)
  })

  if (isMainModule(options.moduleUrl) || process.env['pm_id']) {
    const port = process.env['PORT'] || 4000
    const server = app.listen(port, () => {
      console.log(`Node Express server listening on http://localhost:${port}`)
      if (process.env['NX_READY_SIGNAL_SOCKET']) {
        void (async () => {
          try {
            const load = new Function('s', 'return import(s)') as (
              s: string,
            ) => Promise<{ emitReadySignal(server: unknown): boolean }>
            ;(await load('@nx/js/ready-signal')).emitReadySignal(server)
          } catch {
            // @nx/js is optional in production deployments.
          }
        })()
      }
    })
  }

  return { app, reqHandler: createNodeRequestHandler(app) }
}
