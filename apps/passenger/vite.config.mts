/// <reference types='vitest' />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/passenger',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular(), tailwindcss()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'passenger',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/passenger',
      provider: 'v8' as const,
    },
  },
}))
