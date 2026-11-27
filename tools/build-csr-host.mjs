import { rolldown } from 'rolldown'
import { resolve } from 'node:path'

const [appId, configuration = 'production'] = process.argv.slice(2)

if (
  !['driver', 'passenger', 'inspection', 'panel'].includes(appId) ||
  !['production', 'development'].includes(configuration)
) {
  throw new Error('Expected an application name and production or development configuration.')
}

const environment = resolve(`apps/${appId}/src/environments/environment.ts`)
const bundle = await rolldown({
  input: `apps/${appId}/src/server.ts`,
  platform: 'node',
  tsconfig: 'tsconfig.base.json',
  external: ['express', 'undici', '@microsoft/signalr'],
  plugins: [
    {
      name: 'app-environment',
      resolveId(source, importer) {
        if (
          configuration === 'production' &&
          source === './environments/environment' &&
          importer &&
          resolve(importer) === resolve(`apps/${appId}/src/server.ts`)
        ) {
          return environment.replace(/\.ts$/, '.prod.ts')
        }
        return null
      },
    },
  ],
})

try {
  await bundle.write({
    file: `dist/hosts/${appId}/server.mjs`,
    format: 'esm',
    sourcemap: true,
  })
} finally {
  await bundle.close()
}
