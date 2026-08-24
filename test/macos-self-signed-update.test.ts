import { execFile as execFileCallback } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')

describe.skipIf(process.platform !== 'darwin')('macOS self-signed update identity', () => {
  it('accepts a replacement signed by the same non-Apple designated requirement', async () => {
    const before = await execFile('/usr/bin/security', ['list-keychains', '-d', 'user'])
    const { stdout, stderr } = await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'verify-self-signed-update-identity.mjs')
    ])
    const after = await execFile('/usr/bin/security', ['list-keychains', '-d', 'user'])

    expect(stderr).toBe('')
    expect(stdout).toContain('SELF_SIGNED_UPDATE_IDENTITY_OK')
    expect(after.stdout).toBe(before.stdout)
  }, 30_000)
})
