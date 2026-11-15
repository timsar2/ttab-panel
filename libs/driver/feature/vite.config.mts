/// <reference types='vitest' />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/driver/feature',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  test: {
    name: 'driver-pwa-feature',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/driver/feature',
      provider: 'v8' as const,
    },
  },
}))
