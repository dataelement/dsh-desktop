import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
it('serves authenticated plugin RPC through the actual Desktop composition', async () => {
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/verify-desktop-routes.mjs'],
    { cwd: new URL('..', import.meta.url), timeout: 55000, maxBuffer: 1024 * 1024 })
  expect(stdout).toContain('PASS: actual Desktop entry')
}, 60000)
