/// <reference types='vitest' />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/driver',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular(), tailwindcss()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'driver',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/driver',
      provider: 'v8' as const,
    },
  },
}))
