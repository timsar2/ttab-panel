import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: 'shared-auth-data-access-node',
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
    watch: false,
  },
})
