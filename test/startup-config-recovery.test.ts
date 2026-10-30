import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { recoverStartupConfiguration } from '../src/main/startup-config-recovery'
import {
  importStartupConfig, inspectConfigText, inspectStartupConfiguration, repairStartupConfig,
  replaceRecoveryFile, validModelEndpoint
} from '../src/main/state/startup-config-recovery'

let home: string
beforeEach(async () => { home = await mkdtemp(join(tmpdir(), 'dsh-config-recovery-')) })
afterEach(async () => { await rm(home, { recursive: true, force: true }) })
async function file(relative: string, text: string): Promise<string> {
  const path = join(home, relative)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
  return path
}

describe('startup configuration recovery', () => {
  it('backs up and normalizes only the hidden image fields, preserving comments and expressions', async () => {
    const text = '# keep this comment\n- id: llm-deepseek\n  config:\n    baseURL: !!js process.env.TEST_ENDPOINT\n    models:\n      - id: vision\n        inputModalities: [text]\n        imagePixelBudget: low\n        imageMaxBytes: 12345\n        maxTokens: 8000\n- id: unrelated\n  config:\n    imageMaxBytes: 67890\n'
    const path = await file('profiles/web/cordis.patch.yml', text)
    const problem = (await inspectStartupConfiguration(home))[0]
    expect(problem).toMatchObject({ kind: 'model-image-limits' })
    if (!problem) throw new Error('Missing problem')
    const backup = await repairStartupConfig(home, problem)
    expect(await readFile(backup, 'utf8')).toBe(text)
    if (process.platform !== 'win32') expect((await stat(backup)).mode & 0o777).toBe(0o600)
    const fixed = await readFile(path, 'utf8')
    expect(fixed).toContain('# keep this comment')
    expect(fixed).toContain('!!js process.env.TEST_ENDPOINT')
    expect(fixed).toContain('maxTokens: 8000')
    expect(fixed).toContain('imageMaxBytes: 67890')
    expect(fixed).not.toContain('imageMaxBytes: 12345')
    expect(await inspectStartupConfiguration(home)).toEqual([])
  })

  it('does not inspect or block startup on workspace.json or .credentials.yaml, leaving them to upstream', async () => {
    await file('storages/workspace.json', '{damaged-or-custom')
    await file('.credentials.yaml', '- invalid-yaml-or-custom-structure\n')
    expect(await inspectStartupConfiguration(home)).toEqual([])
  })

  it('preserves unrelated model settings when resetting an explicitly invalid DeepSeek address', async () => {
    const text = '- id: llm-deepseek\n  config:\n    baseURL: missing-protocol\n    maxTokens: 12345\n'
    const path = await file('profiles/web/cordis.patch.yml', text)
    const [problem] = await inspectStartupConfiguration(home)
    if (!problem) throw new Error('Missing problem')
    expect(problem).toMatchObject({ kind: 'model-url', repair: 'reset-endpoint' })
    await repairStartupConfig(home, problem)
    expect(await readFile(path, 'utf8')).toContain('maxTokens: 12345')
    expect(await inspectStartupConfiguration(home)).toEqual([])
    expect(inspectConfigText(path, '- id: llm-pi-ai\n  config:\n    providers:\n      custom:\n        baseURL: missing-protocol\n')[0]?.repair).toBeUndefined()
  })

  it('uses the launch environment for endpoints and never mistakes a credential ref for an endpoint', async () => {
    const env = { DEEPSEEK_BASE_URL: 'synthetic-private-invalid' }
    expect((await inspectStartupConfiguration(home, 'web', env))[0]?.source).toBe('environment:DEEPSEEK_BASE_URL')
    await file('.credentials.yaml', 'version: 1\nrefs:\n  DEEPSEEK_BASE_URL: synthetic-credential-invalid\n')
    const [problem] = await inspectStartupConfiguration(home, 'web', env)
    expect(problem?.source).toBe('environment:DEEPSEEK_BASE_URL')
    expect(JSON.stringify(problem)).not.toContain('synthetic-credential-invalid')
    await file('profiles/web/cordis.patch.yml', '- id: llm-deepseek\n  config:\n    baseURL: https://example.test/v1\n')
    expect(await inspectStartupConfiguration(home, 'web', env)).toEqual([])
  })

  it('identifies forbidden .env endpoint sources without displaying values or offering YAML import', async () => {
    await file('.env', 'DEEPSEEK_BASE_URL=synthetic-private-invalid\n')
    const [problem] = await inspectStartupConfiguration(home)
    expect(problem).toMatchObject({ source: '.env:DEEPSEEK_BASE_URL', manualOnly: true, path: join(home, '.env') })
    expect(JSON.stringify(problem)).not.toContain('synthetic-private-invalid')
    const shown: string[][] = []
    const show = vi.fn(async (options: { buttons?: string[] }) => { shown.push(options.buttons ?? []); return { response: 2 } })
    await recoverStartupConfiguration({ dshHome: home, chinese: false, environment: {}, stop: vi.fn(),
      show, selectFile: vi.fn(), reveal: vi.fn(), note: vi.fn() })
    expect(shown[0]).toEqual(['Reveal Original File', 'Check Again', 'Back'])
  })

  it('backs up and migrates legacy workflow-worker-thread to workflow-ptc without disabling the preset', async () => {
    const text = '- insert:\n    - id: preset-custom\n      name: "@deepseek-ai/dsh-agent-preset"\n      config:\n        plugins:\n          - id: workflow-worker-thread\n            name: "@deepseek-ai/dsh-workflow-worker-thread"\n    - id: preset-kept\n      name: "@deepseek-ai/dsh-agent-preset"\n'
    const path = await file('profiles/web/cordis.patch.yml', text)
    const [problem] = await inspectStartupConfiguration(home)
    if (!problem) throw new Error('Missing problem')
    expect(problem.kind).toBe('legacy-workflow')
    expect(problem.source).toContain('owner=preset-custom')
    const backup = await repairStartupConfig(home, problem)
    expect(await readFile(backup, 'utf8')).toBe(text)
    const fixed = parse(await readFile(path, 'utf8'))
    expect(fixed[0].insert[0].disabled).toBeUndefined()
    expect(fixed[0].insert[1].disabled).toBeUndefined()
    expect(fixed[0].insert[0].config.plugins[0].name).toBe('@deepseek-ai/dsh-workflow-ptc')
    expect(fixed[0].insert[0].config.plugins[0].id).toBe('workflow-ptc')
    expect(fixed[0].insert[0].config.plugins[0].config).toEqual({ provider: 'spawn' })
    expect(await readFile(path, 'utf8')).not.toContain('@deepseek-ai/dsh-workflow-worker-thread')
    expect(await inspectStartupConfiguration(home)).toEqual([])
  })

  it('does not overwrite concurrent edits, unknown targets, or symlink destinations', async () => {
    const path = await file('settings.yaml', 'first: value\n')
    await expect(replaceRecoveryFile(home, path, 'stale', 'next')).rejects.toThrow('Configuration changed')
    const unknown = await file('node_modules/config.yaml', 'original')
    await expect(replaceRecoveryFile(home, unknown, 'original', 'next')).rejects.toThrow('known startup file')
    await rm(path)
    await symlink(unknown, path)
    await expect(replaceRecoveryFile(home, path, 'original', 'next')).rejects.toThrow('owned regular file')
    expect(await readFile(unknown, 'utf8')).toBe('original')
  })

  it.each(['example.test', '', ' https://example.test', 'file:///tmp/config', 'https://user:pass@example.test', 'https://example.test?q=1'])('rejects unsafe DeepSeek endpoint %s', value => {
    expect(validModelEndpoint(value, true)).toBe(false)
  })

  it('runs native repair while Harness is stopped and returns a retry without opening a renderer', async () => {
    const text = '- id: llm-deepseek\n  config:\n    baseURL: invalid-endpoint\n'
    await file('profiles/web/cordis.patch.yml', text)
    const stop = vi.fn(async () => {})
    const result = await recoverStartupConfiguration({ dshHome: home, chinese: true, environment: {}, stop,
      show: vi.fn(async () => ({ response: 0 })),
      selectFile: vi.fn(), reveal: vi.fn(), note: vi.fn() })
    expect(result).toBe('retry')
    expect(stop).toHaveBeenCalledOnce()
    expect((await readdir(join(home, 'profiles', 'web'))).some(name => name.endsWith('.bak'))).toBe(true)
  })

  it('waits for launch rollback before inspecting and suppresses recovery after shutdown', async () => {
    const text = '- id: broken-entry\n  name: "@deepseek-ai/dsh-workflow-worker-thread"\n'
    await file('profiles/web/cordis.patch.yml', text)
    let finishLaunch: () => void = () => { throw new Error('Launch barrier not initialized') }
    const pendingLaunch = new Promise<void>(resolve => { finishLaunch = resolve })
    const show = vi.fn(async () => ({ response: 3 }))
    let cancelled = false
    const recovery = recoverStartupConfiguration({ dshHome: home, environment: {}, chinese: false,
      beforeInspect: () => pendingLaunch, cancelled: () => cancelled,
      stop: vi.fn(), show, selectFile: vi.fn(), reveal: vi.fn(), note: vi.fn() })
    await Promise.resolve()
    expect(show).not.toHaveBeenCalled()
    await file('profiles/web/cordis.patch.yml', '- id: kept\n')
    finishLaunch()
    expect(await recovery).toBe('continue')
    expect(show).not.toHaveBeenCalled()
    cancelled = true
    await file('profiles/web/cordis.patch.yml', text)
    expect(await recoverStartupConfiguration({ dshHome: home, environment: {}, chinese: false,
      cancelled: () => cancelled, stop: vi.fn(), show, selectFile: vi.fn(), reveal: vi.fn(), note: vi.fn()
    })).toBe('continue')
    expect(show).not.toHaveBeenCalled()
  })

  it('marks pi-ai invalid endpoints and environment variables as non-blocking to keep UI editable', async () => {
    const text = '- id: llm-pi-ai\n  config:\n    providers:\n      broken:\n        baseURL: missing-protocol\n'
    const path = await file('profiles/web/cordis.patch.yml', text)
    const problems = inspectConfigText(path, text)
    expect(problems).toHaveLength(1)
    expect(problems[0]?.kind).toBe('model-url')
    expect(problems[0]?.blocking).toBe(false)
  })
})
