/// <reference types='vitest' />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import { resolve } from 'node:path'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/transport/lines/feature',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular({ tsconfig: resolve(import.meta.dirname, 'tsconfig.spec.json') })],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'transport-lines-feature',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/transport/lines/feature',
      provider: 'v8' as const,
    },
  },
}))
