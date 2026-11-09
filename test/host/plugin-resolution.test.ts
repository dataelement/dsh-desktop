import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeAll, expect, it } from 'vitest'
import { DesktopHostFatalError, DesktopHostProcess } from '../../src/main/shell/backend/host-process'
import { DESKTOP_SAFE_PRODUCT_PATCH } from '../../src/main/shell/product-patch'
import { ensureHostBundle, hostBundle } from './host-bundle-helper'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const root = resolve(import.meta.dirname, '../..')
const temporary: string[] = []

beforeAll(async () => {
  await ensureHostBundle()
}, 180_000)

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('loads the installation bundles on the new host', async () => {
  const home = await temporaryHome()
  const result = await boot(home, {})
  expect(result.ok, result.diagnostic.slice(0, 500)).toBe(true)
  expect(result.diagnostic.includes('@deepseek-ai/dsh-client-modules')).toBe(true)
}, 120_000)

it('loads a market plugin and its own dependency from the profile', async () => {
  const home = await temporaryHome()
  const marker = join(home, 'marker.txt')
  await installPlugin(join(home, 'profiles', 'node_modules', 'resolution-sample'), pluginEntry("import { marker } from 'sample-ordinary'"))
  await installOrdinary(join(home, 'profiles', 'node_modules', 'resolution-sample'), 'ordinary-loaded')
  const result = await boot(home, { marker, plugin: 'resolution-sample' })
  expect(result.ok, result.diagnostic).toBe(true)
  expect(await readFile(marker, 'utf8')).toBe('ordinary-loaded\n')
}, 120_000)

it('loads a symlinked plugin from its physical directory', async () => {
  const home = await temporaryHome()
  const marker = join(home, 'marker.txt')
  const source = join(home, 'linked-source')
  await installPlugin(source, pluginEntry("import { marker } from 'sample-ordinary'"))
  await installOrdinary(source, 'linked-ordinary')
  await mkdir(join(home, 'profiles', 'node_modules'), { recursive: true })
  await symlink(source, join(home, 'profiles', 'node_modules', 'resolution-sample'))
  const result = await boot(home, { marker, plugin: 'resolution-sample' })
  expect(result.ok, result.diagnostic).toBe(true)
  expect(await readFile(marker, 'utf8')).toBe('linked-ordinary\n')
}, 120_000)

it('keeps a missing host peer distinct from a missing plugin', async () => {
  const home = await temporaryHome()
  await installPlugin(join(home, 'profiles', 'node_modules', 'resolution-sample'), pluginEntry("import '@deepseek-ai/missing-host-peer'"))
  const peer = await boot(home, { plugin: 'resolution-sample' })
  expect(peer.ok).toBe(false)
  expect(peer.diagnostic).toContain('ERR_MODULE_NOT_FOUND')
  expect(peer.diagnostic).toContain('@deepseek-ai/missing-host-peer')
  expect(peer.diagnostic).toContain('resolution-sample')
  expect(peer.diagnostic).not.toContain('host fallback from')

  const absentHome = await temporaryHome()
  const absent = await boot(absentHome, { plugin: 'resolution-absent' })
  expect(absent.ok).toBe(false)
  expect(absent.diagnostic).toContain('resolution-absent')
  expect(absent.diagnostic).not.toContain('@deepseek-ai/missing-host-peer')
  expect(absent.diagnostic).not.toContain('sample-ordinary-missing')
}, 120_000)

it('names a missing ordinary dependency instead of the plugin package', async () => {
  const home = await temporaryHome()
  await installPlugin(join(home, 'profiles', 'node_modules', 'resolution-sample'), pluginEntry("import 'sample-ordinary-missing'"))
  const result = await boot(home, { plugin: 'resolution-sample' })
  expect(result.ok).toBe(false)
  expect(result.diagnostic).toContain('ERR_MODULE_NOT_FOUND')
  expect(result.diagnostic).toContain('sample-ordinary-missing')
  expect(result.diagnostic).toContain('resolution-sample')
  expect(result.diagnostic).not.toContain('@deepseek-ai/missing-host-peer')
  expect(result.diagnostic).not.toContain('host fallback from')
}, 120_000)

function pluginEntry(importLine: string): string {
  return [
    importLine,
    "import { appendFileSync } from 'node:fs'",
    'const target = process.env.DSH_RESOLUTION_MARKER',
    "if (typeof target === 'string' && target.length > 0 && typeof marker === 'string') appendFileSync(target, marker + '\\n')",
    "export const name = 'resolution-sample'",
    'export const inject = []',
    'export function apply() {}',
    ''
  ].join('\n')
}

async function temporaryHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-resolution-'))
  temporary.push(home)
  return home
}

async function installPlugin(directory: string, entry: string): Promise<void> {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({
    name: 'resolution-sample',
    version: '1.0.0',
    private: true,
    type: 'module',
    exports: { '.': './index.js' }
  }))
  await writeFile(join(directory, 'index.js'), entry)
}

async function installOrdinary(pluginDirectory: string, marker: string): Promise<void> {
  const directory = join(pluginDirectory, 'node_modules', 'sample-ordinary')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({
    name: 'sample-ordinary',
    version: '1.0.0',
    type: 'module',
    exports: { '.': './index.js' }
  }))
  await writeFile(join(directory, 'index.js'), `export const marker = ${JSON.stringify(marker)}\n`)
}

async function boot(home: string, input: { marker?: string, plugin?: string }): Promise<{ ok: boolean, diagnostic: string }> {
  await ensureHostBundle()
  const profile = join(home, 'profiles', 'desktop')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: input.plugin === undefined ? {} : { [input.plugin]: '1.0.0' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]\n')
  await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
  const patch = join(home, 'resolution.patch.yml')
  const pluginRow = input.plugin === undefined ? '' : `- insert:\n    - id: ${input.plugin}\n      name: ${input.plugin}\n`
  await writeFile(patch, `${DESKTOP_SAFE_PRODUCT_PATCH}${pluginRow}`)
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: 'desktop',
    environment: {
      DSH_DESKTOP_PATCH_FILE: patch,
      ...(input.marker === undefined ? {} : { DSH_RESOLUTION_MARKER: input.marker })
    },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    return { ok: true, diagnostic: JSON.stringify(ready.injections) }
  } catch (error) {
    const diagnostic = error instanceof DesktopHostFatalError
      ? `${error.message}\n${error.diagnostic ?? ''}`
      : error instanceof Error ? error.message : String(error)
    return { ok: false, diagnostic }
  } finally {
    await host.stop().catch(() => undefined)
  }
}
