import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import CredentialsLocal from '@deepseek-ai/dsh-credentials-local'

describe('Credentials Local tolerance', () => {
  it('does not throw when encountering non-standard keys like agnes-api-key', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-creds-test-'))
    try {
      const credentialsFile = join(dir, '.credentials.yaml')
      await writeFile(credentialsFile, `version: 1
records:
  agnes-api-key:
    kind: api-key
    key: test-key-value
  valid-scope/valid-id:
    kind: api-key
    key: secret-valid-123
refs:
  INVALID-REF!: invalid
  VALID_REF: ok-ref-value
`, { mode: 0o600 })

      const ctx = new Context()
      await expect(
        ctx.plugin(CredentialsLocal, { path: credentialsFile })
      ).resolves.not.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

