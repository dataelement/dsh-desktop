import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it.skipIf(process.platform !== 'win32')('hides the target console through real Electron and Windows Job hops', async () => {
  const require = createRequire(import.meta.url)
  const electron: string = require('electron')
  const { stdout } = await promisify(execFile)(electron, [
    '--import', new URL('../../build/windows-hide-console-import.mjs', import.meta.url).href,
    fileURLToPath(new URL('./fixtures/hidden-console-job.mjs', import.meta.url))
  ], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, timeout: 20_000 })
  expect(JSON.parse(stdout.trim())).toEqual({ attached: true, visible: false })
}, 25_000)
