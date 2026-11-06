delete process.env.ELECTRON_RUN_AS_NODE
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { packagedImportsPlugin } = require('./scripts/packaged-imports.cjs') as {
  packagedImportsPlugin(dependencies: Record<string, string>, preload?: boolean): import('rollup').Plugin
}
const { dependencies } = require('./package.json') as { dependencies: Record<string, string> }

// `build:shell` passes `--outDir out-shell`. electron-vite then writes `main/` and `preload/` under it.
// Host is a second main entry: electron-vite has no separate target, and this process is spawned with ELECTRON_RUN_AS_NODE.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), packagedImportsPlugin(dependencies)],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/shell/app.ts'),
          host: resolve('src/host/index.ts'),
          'operation-report-worker': resolve('src/main/shell/operation-report-worker.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), packagedImportsPlugin(dependencies, true)],
    build: {
      rollupOptions: {
        input: {
          app: resolve('src/preload/app.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  }
})
