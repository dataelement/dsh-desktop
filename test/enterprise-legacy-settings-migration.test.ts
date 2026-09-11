import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parse } from 'yaml'
import { migrateLegacyEnterpriseSettings } from '../src/main/enterprise/legacy-settings-migration'

let directory: string | undefined

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
  directory = undefined
})

async function fixture(source: string): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'dsh-enterprise-settings-'))
  const path = join(directory, 'settings.yaml')
  await writeFile(path, source, 'utf8')
  return path
}

describe('legacy enterprise settings migration', () => {
  it('removes the preview-owned provider and account snapshot while preserving other settings', async () => {
    const path = await fixture(`
llm-pi-ai:
  providers:
    existing:
      apiKeyEnv: EXISTING_KEY
    bisheng-enterprise:
      apiKeyEnv: BISHENG_ENTERPRISE_TOKEN
      baseURL: http://127.0.0.1:17860/api/v1/models/openai
agent-default-model:
  provider: existing
  model: example
dsh-desktop-enterprise:
  platformUrl: http://127.0.0.1:17860
  accountId: user-alice
`)

    await expect(migrateLegacyEnterpriseSettings(directory!)).resolves.toEqual({
      changed: true,
      removed: [
        'llm-pi-ai.providers.bisheng-enterprise',
        'dsh-desktop-enterprise'
      ]
    })

    const settings = parse(await readFile(path, 'utf8'))
    expect(settings['llm-pi-ai'].providers).toEqual({
      existing: { apiKeyEnv: 'EXISTING_KEY' }
    })
    expect(settings['agent-default-model']).toEqual({ provider: 'existing', model: 'example' })
    expect(settings).not.toHaveProperty('dsh-desktop-enterprise')
  })

  it('keeps a user-managed provider that lacks the preview credential marker', async () => {
    const path = await fixture(`
llm-pi-ai:
  providers:
    bisheng-enterprise:
      apiKeyEnv: USER_MANAGED_KEY
      baseURL: https://enterprise.example.com/v1
`)

    await expect(migrateLegacyEnterpriseSettings(directory!)).resolves.toEqual({
      changed: false,
      removed: []
    })
    expect(await readFile(path, 'utf8')).toContain('USER_MANAGED_KEY')
  })

  it('leaves an invalid settings document unchanged', async () => {
    const path = await fixture('llm-pi-ai: [\n')
    const before = await readFile(path, 'utf8')

    await expect(migrateLegacyEnterpriseSettings(directory!)).resolves.toEqual({
      changed: false,
      removed: []
    })
    expect(await readFile(path, 'utf8')).toBe(before)
  })
})
