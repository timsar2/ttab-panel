import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node'
import express from 'express'
import { createAuthBff, readAuthBffConfig } from '@org/auth-data-access/node'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { environment } from './environments/environment'

const serverDistFolder = dirname(fileURLToPath(import.meta.url))
const browserDistFolder = resolve(serverDistFolder, '../browser')

const app = express()
app.disable('x-powered-by')
// Missing/invalid deployment configuration disables API access, never SSR-falls through.
const authConfig = (() => {
  try {
    return readAuthBffConfig(process.env, {
      apiUrl: environment.apiUrl,
      production: environment.production,
      developmentOrigin: 'http://localhost:4200',
    })
  } catch {
    console.error(
      'Authentication BFF is disabled: configure a valid API URL, public origin, and server-only session secret.',
    )
    return null
  }
})()
const authBff = authConfig
  ? createAuthBff({
      config: authConfig,
      onDiagnostic: diagnostic => {
        if (diagnostic.status && diagnostic.status >= 400) console.warn('[auth-bff]', diagnostic)
        else console.info('[auth-bff]', diagnostic)
      },
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

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    // Public files are not all fingerprinted, so require revalidation.
    maxAge: 0,
    index: false,
    redirect: false,
  }),
)

/**
 * Handle all other requests by rendering the Angular application.
 */
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

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000
  const server = app.listen(port, async (error?: Error) => {
    if (error) {
      throw error
    }

    console.log(`Node Express server listening on http://localhost:${port}`)
    // Set when Nx waits for this server to be ready
    if (process.env['NX_READY_SIGNAL_SOCKET']) {
      try {
        // Function keeps TypeScript and bundlers from rewriting or bundling the import
        const load = new Function('s', 'return import(s)') as (
          s: string,
        ) => Promise<{ emitReadySignal(server: unknown): boolean }>
        ;(await load('@nx/js/ready-signal')).emitReadySignal(server)
      } catch {
        // @nx/js isn't installed
      }
    }
  })
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app)
