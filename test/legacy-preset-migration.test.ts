import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import jsYaml from 'js-yaml'
import { applyEntryPatches, entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { migrateLegacyAgentPresets } from '../src/main/state/legacy-preset-migration'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { resolveTestNodeExecutable } from './node-executable'

const homes: string[] = []
afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
})

it('converts legacy presets into the web Profile while retaining originals and first backups', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-legacy-preset-'))
  homes.push(home)
  const source = join(home, '.agent-presets', 'custom')
  const profile = join(home, 'profiles', 'web')
  await mkdir(source, { recursive: true })
  await mkdir(profile, { recursive: true })
  const composition = '- id: persona\n  name: "@deepseek-ai/dsh-persona"\n  disabled: !!js process.platform === "win32"\n'
  await writeFile(join(source, 'agent.cordis.yml'), composition)
  await writeFile(join(source, 'preset.yml'), 'name: Custom mode\norder: 9\n')
  await writeFile(join(profile, 'cordis.patch.yml'), '- id: untouched\n  disabled: true\n')
  const notes: string[] = []
  await migrateLegacyAgentPresets(home, (line) => notes.push(line))
  const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
  expect(patch).toContain('- id: untouched')
  expect(patch).toContain('id: preset-custom')
  expect(patch).toContain('id: custom')
  expect(patch).toContain('disabled: !!js process.platform === "win32"')
  expect(await readFile(join(home, '.agent-presets.pre-0.1.7-backup', 'custom', 'agent.cordis.yml'), 'utf8')).toBe(composition)
  expect(await readFile(`${join(profile, 'cordis.patch.yml')}.pre-0.1.7-backup`, 'utf8')).toBe('- id: untouched\n  disabled: true\n')
  await migrateLegacyAgentPresets(home, (line) => notes.push(line))
  expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe(patch)
  expect(notes).toHaveLength(1)

  const edited = patch.replace('Custom mode', 'Edited in the new Profile')
  await writeFile(join(profile, 'cordis.patch.yml'), edited)
  await migrateLegacyAgentPresets(home, (line) => notes.push(line))
  expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe(edited)
  const imported = join(home, '.agent-presets', 'imported')
  await mkdir(imported)
  await writeFile(join(imported, 'agent.cordis.yml'), composition)
  await migrateLegacyAgentPresets(home, (line) => notes.push(line))
  const extended = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
  expect(extended).toContain('Edited in the new Profile')
  expect(extended).toContain('id: preset-imported')
  expect(notes).toHaveLength(2)
})

it('updates a shipped preset row and leaves an invalid legacy preset out of the generated patch', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-legacy-preset-'))
  homes.push(home)
  for (const id of ['standard', 'broken']) await mkdir(join(home, '.agent-presets', id), { recursive: true })
  await writeFile(join(home, '.agent-presets', 'standard', 'agent.cordis.yml'), '- id: persona\n  name: "@deepseek-ai/dsh-persona"\n')
  await writeFile(join(home, '.agent-presets', 'broken', 'agent.cordis.yml'), 'not a plugin list\n')
  const notes: string[] = []
  await migrateLegacyAgentPresets(home, (line) => notes.push(line))
  const patch = await readFile(join(home, 'profiles', 'web', 'cordis.patch.yml'), 'utf8')
  expect(patch).toContain('- id: preset-standard\n  config:')
  expect(patch).not.toContain('id: preset-broken')
  expect(notes.some((line) => line.includes('broken could not be converted'))).toBe(true)

  const shippedText = await readFile(join(import.meta.dirname, '../node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml'), 'utf8')
  const shipped = jsYaml.load(shippedText, { schema: entryListSchema }) as Array<Record<string, unknown>>
  const migrated = jsYaml.load(patch, { schema: entryListSchema }) as Array<Record<string, unknown>>
  const warnings: string[] = []
  const entries = applyEntryPatches(applyEntryPatches([], shipped, (warning) => warnings.push(warning)), migrated, (warning) => warnings.push(warning))
  const standard = entries.find((entry) => entry.id === 'preset-standard') as { config?: { id?: string; plugins?: Array<{ id: string }> } } | undefined
  expect(warnings).toEqual([])
  expect(standard?.config?.id).toBe('standard')
  expect(standard?.config?.plugins?.map((entry) => entry.id)).toEqual(['persona'])
})

it('publishes a migrated custom preset through the real Harness web registry', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-legacy-preset-runtime-'))
  homes.push(home)
  const source = join(home, '.agent-presets', 'custom')
  await mkdir(source, { recursive: true })
  await writeFile(join(source, 'agent.cordis.yml'), '- id: persona\n  name: "@deepseek-ai/dsh-persona"\n  config:\n    prefix: Migrated runtime mode\n')
  await writeFile(join(source, 'preset.yml'), 'name: Migrated runtime mode\n')
  await migrateLegacyAgentPresets(home, () => {})
  const overlay = join(home, 'desktop.patch.yml')
  await writeFile(overlay, '[]\n')
  const root = resolve(import.meta.dirname, '..')
  const runtime = new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: resolveTestNodeExecutable(),
    dshPatchPath: overlay,
    dshSafePatchPath: overlay,
    dshHome: home,
    logPath: join(home, 'runtime.log'),
    preferredPort: 0,
    startupTimeoutMs: 30_000,
    launchProcess: (executable, args, options) => spawn(executable, args, options),
    onChanged() {}
  })
  try {
    await runtime.start(home, 'web')
    expect(runtime.snapshot().phase, runtime.snapshot().logs.join('\n')).toBe('ready')
    const { url, authToken } = runtime.snapshot()
    if (!url || !authToken) throw new Error('Harness did not announce its endpoint')
    const login = await fetch(`${url}/?token=${encodeURIComponent(authToken)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    const roster = await fetch(new URL('/api/agentPresets/list', url), {
      method: 'POST',
      headers: { Cookie: cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'migrated-presets', method: 'agentPresets/list', payload: { args: {} } })
    })
    expect(roster.status).toBe(200)
    expect(await roster.text()).toContain('"id":"custom"')
    const html = await (await fetch(url, { headers: { Cookie: cookie } })).text()
    expect(html).toContain('@deepseek-ai/dsh-client-ui-agent-preset')
    const preload = [...html.matchAll(/<link[^>]+>/gu)].map((match) => match[0]).find((tag) => tag.includes('@deepseek-ai/dsh-client-ui-agent-preset/client.js'))
    expect(preload).toBeDefined()
    const href = preload?.match(/href="([^"]+)"/u)?.[1]
    if (!href) throw new Error(`Preset preload URL missing: ${preload}`)
    const response = await fetch(new URL(href.replaceAll('&amp;', '&'), url), { headers: { Cookie: cookie } })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('const previewImport = async (file) =>')
  } finally {
    await runtime.stop()
  }
}, 45_000)
