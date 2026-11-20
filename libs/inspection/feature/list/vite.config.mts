/// <reference types='vitest' />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import { resolve } from 'node:path'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/inspection/feature/list',
  resolve: { tsconfigPaths: true },
  plugins: [angular({ tsconfig: resolve(import.meta.dirname, 'tsconfig.spec.json') })],
  test: {
    name: 'inspection-feature-list',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
  },
}))
