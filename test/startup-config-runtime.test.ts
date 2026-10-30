import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { parseCredentialsDocument } from '@deepseek-ai/dsh-credentials-local'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { recoverStartupConfiguration } from '../src/main/startup-config-recovery'
import { inspectStartupConfiguration } from '../src/main/state/startup-config-recovery'
import { migrateLegacyAgentPresets } from '../src/main/state/legacy-preset-migration'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../src/main/state/safe-mode-profile'
import { resolveTestNodeExecutable } from './node-executable'

it('recovers saved configuration and an old preset before booting a real Harness and creating a session', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'dsh-config-runtime-')))
  await mkdir(join(home, 'launch-root'), { recursive: true })
  const launchRoot = await realpath(join(home, 'launch-root'))
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'recovery-fixture', private: true,
    dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } }))
  await symlink(resolve('node_modules'), join(home, 'profiles', 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  const workspace = { unit: { name: 'workspace', version: 2 }, global: {
    initialized: true, workspaceIds: ['kept'], archivedSessionIds: [], pinnedSessionIds: []
  }, tables: { workspaces: { kept: { path: launchRoot, title: 'Kept workspace', sessionIds: [],
    createdAt: '2026-01-01', updatedAt: '2026-01-01' } } } }
  await mkdir(join(home, 'storages'))
  const workspacePath = join(home, 'storages', 'workspace.json')
  await writeFile(workspacePath, JSON.stringify(workspace))
  await writeFile(join(home, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC_TEST_KEY: value-kept\n', { mode: 0o600 })
  await writeFile(join(profile, 'cordis.patch.yml'), '- id: llm-deepseek\n  config:\n    baseURL: invalid-endpoint\n    models:\n      - id: synthetic-model\n        inputModalities: [text]\n        imageMaxBytes: 12345\n        imagePixelBudget: low\n        maxTokens: 8000\n')
  const preset = join(home, '.agent-presets', 'legacy-custom')
  await mkdir(preset, { recursive: true })
  const legacy = '- id: old-workflow\n  name: "@deepseek-ai/dsh-workflow-worker-thread"\n'
  await writeFile(join(preset, 'agent.cordis.yml'), legacy)
  await migrateLegacyAgentPresets(home, () => {})
  await ensureSafeModeProfile(home)
  const runtime = new HarnessRuntime({
    dshEntryPath: resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: resolve('build/harness-node-entry.mjs'), nodeExecutablePath: resolveTestNodeExecutable(),
    dshPatchPath: resolve('build/dsh-desktop-safe.patch.yml'), dshSafePatchPath: resolve('build/dsh-desktop-safe.patch.yml'),
    dshHome: home, logPath: join(home, 'runtime.log'), startupTimeoutMs: 30_000, preferredPort: 0,
    launchProcess: (executable, args, options) => spawn(executable, args, options), onChanged() {}
  })
  const backups: string[] = []
  try {
    await runtime.start(launchRoot)
    expect(runtime.snapshot().phase).toBe('failed')
    expect(runtime.snapshot().message).not.toContain('model-url')
    expect(runtime.snapshot().message).toContain('model-image-limits')
    expect(runtime.snapshot().logs.join('\n')).not.toContain('[harness-node] runtime')
    expect(await recoverStartupConfiguration({ dshHome: home, environment: {}, chinese: false,
      stop: () => runtime.stop(), show: async () => ({ response: 0 }),
      selectFile: async () => ({ canceled: false, filePaths: [] }), reveal() {},
      note: line => backups.push(line)
    })).toBe('retry')
    expect(runtime.snapshot().logs.join('\n')).toContain('auto-migrated legacy-workflow to workflow-ptc')
    expect(await inspectStartupConfiguration(home)).toEqual([])
    expect(await readFile(join(preset, 'agent.cordis.yml'), 'utf8')).toBe(legacy)
    const fixed = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
    expect(fixed).toContain('@deepseek-ai/dsh-workflow-ptc')
    expect(fixed).not.toContain('@deepseek-ai/dsh-workflow-worker-thread')
    expect(fixed).toContain('maxTokens: 8000')
    await migrateLegacyAgentPresets(home, () => {})
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe(fixed)
    await ensureSafeModeProfile(home)
    await runtime.start(launchRoot)
    const snapshot = runtime.snapshot()
    expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
    if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce its endpoint')
    const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const created = await fetch(new URL('/api/session/create', snapshot.url), { method: 'POST',
      headers: { Cookie: cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'recovered-session', method: 'session/create', payload: { args: { request: {} } } }) })
    const envelope = await created.json()
    expect(envelope.result?.ok, JSON.stringify(envelope)).toBe(true)
    expect(envelope.result?.value?.sessionId).toBeTruthy()
    const persisted = JSON.parse(await readFile(workspacePath, 'utf8'))
    expect(persisted.tables.workspaces.kept.title).toBe('Kept workspace')
    expect(parseCredentialsDocument(await readFile(join(home, '.credentials.yaml'), 'utf8'), '').refs.get('SYNTHETIC_TEST_KEY')).toBe('value-kept')
  } finally {
    await runtime.stop()
    await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}, 60_000)
