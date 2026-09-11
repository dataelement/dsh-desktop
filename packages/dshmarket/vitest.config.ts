import { defineConfig } from 'vitest/config'

// Unit lane: fast, no network, no real pnpm. The real-pnpm matrix lives in
// tests/*.compat.spec.ts and runs through vitest.compat.config.ts instead
// (`npm run test:compat`).
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    exclude: ['tests/**/*.compat.spec.ts', '**/node_modules/**'],
    pool: 'forks',
    testTimeout: 20_000,
    server: {
      deps: {
        // ui-primitives (and its katex dependency) ship raw .css imports;
        // inlining routes them through vite's transform for the jsdom lane.
        inline: [/@deepseek-ai\/dsh-client-/, /katex/],
      },
    },
  },
})
