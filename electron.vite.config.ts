delete process.env.ELECTRON_RUN_AS_NODE
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { packagedImportsPlugin } = require('./scripts/packaged-imports.cjs') as {
  packagedImportsPlugin(dependencies: Record<string, string>, preload?: boolean): import('rollup').Plugin
}
const { dependencies } = require('./package.json') as { dependencies: Record<string, string> }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), packagedImportsPlugin(dependencies)]
  },
  preload: {
    plugins: [externalizeDepsPlugin(), packagedImportsPlugin(dependencies, true)],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  }
})
