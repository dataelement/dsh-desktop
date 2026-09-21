import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
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

async function leftoverMigrationFiles(root: string): Promise<string[]> {
  return (await readdir(root)).filter((name) => name.includes('.enterprise-migration'))
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
    const migrated = await readFile(path, 'utf8')
    await expect(migrateLegacyEnterpriseSettings(directory!)).resolves.toEqual({ changed: false, removed: [] })
    expect(await readFile(path, 'utf8')).toBe(migrated)
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

  it('returns unchanged when settings.yaml is missing', async () => {
    directory = await mkdtemp(join(tmpdir(), 'dsh-enterprise-settings-'))

    await expect(migrateLegacyEnterpriseSettings(directory)).resolves.toEqual({
      changed: false,
      removed: []
    })
    expect(await leftoverMigrationFiles(directory)).toEqual([])
  })

  it('removes a preview account snapshot without touching other providers', async () => {
    const path = await fixture(`
llm-pi-ai:
  providers:
    existing:
      apiKeyEnv: EXISTING_KEY
dsh-desktop-enterprise:
  modelBaseUrl: http://127.0.0.1:17860/api/v1/models/openai
`)

    await expect(migrateLegacyEnterpriseSettings(directory!)).resolves.toEqual({
      changed: true,
      removed: ['dsh-desktop-enterprise']
    })
    const settings = parse(await readFile(path, 'utf8'))
    expect(settings['llm-pi-ai'].providers).toEqual({
      existing: { apiKeyEnv: 'EXISTING_KEY' }
    })
    expect(settings).not.toHaveProperty('dsh-desktop-enterprise')
  })

  it('cleans the temporary file and keeps the original settings when write fails', async () => {
    const path = await fixture(`
dsh-desktop-enterprise:
  accountId: user-alice
`)
    const before = await readFile(path, 'utf8')

    await expect(migrateLegacyEnterpriseSettings(directory!, {
      writeFile: async (target, contents, options) => {
        await writeFile(target, contents, options)
        throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' })
      }
    })).rejects.toMatchObject({ code: 'ENOSPC' })
    expect(await readFile(path, 'utf8')).toBe(before)
    expect(await leftoverMigrationFiles(directory!)).toEqual([])
  })

  it('cleans the temporary file and keeps the original settings when replace fails', async () => {
    const path = await fixture(`
dsh-desktop-enterprise:
  platformUrl: http://127.0.0.1:17860
`)
    const before = await readFile(path, 'utf8')

    await expect(migrateLegacyEnterpriseSettings(directory!, {
      rename: async () => {
        throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' })
      }
    })).rejects.toMatchObject({ code: 'EBUSY' })
    expect(await readFile(path, 'utf8')).toBe(before)
    expect(await leftoverMigrationFiles(directory!)).toEqual([])
  })

  it('replaces the original settings file after a successful write', async () => {
    const path = await fixture(`
dsh-desktop-enterprise:
  platformUrl: http://127.0.0.1:17860
`)
    let renamed = false
    await expect(migrateLegacyEnterpriseSettings(directory!, {
      rename: async (from, to) => {
        renamed = true
        await rename(from, to)
      }
    })).resolves.toEqual({
      changed: true,
      removed: ['dsh-desktop-enterprise']
    })
    expect(renamed).toBe(true)
    expect(parse(await readFile(path, 'utf8'))).not.toHaveProperty('dsh-desktop-enterprise')
    expect(await leftoverMigrationFiles(directory!)).toEqual([])
  })
})
