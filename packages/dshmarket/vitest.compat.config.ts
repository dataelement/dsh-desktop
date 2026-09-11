import { defineConfig } from 'vitest/config'

// Compat lane: exercises REAL pnpm 9/10/11 (via npx) against throwaway
// profile fixtures — network access and several minutes of runtime. This is
// where the failure signatures behind #20/#21/#22 are pinned.
export default defineConfig({
  test: {
    include: ['tests/**/*.compat.spec.ts'],
    pool: 'forks',
    // Real installs; the first npx pnpm@<version> also downloads that pnpm.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
})
