import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'
import { createGenerationPackageBackend } from '../packages/dsh-desktop-market-installer/generations/package-backend.mjs'
import { readDisabledPlugins } from '../packages/dsh-desktop-market-installer/plugin-state.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

/** A web Profile with one installed community bundle, as launch projection leaves it. */
async function profileWithBundle() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-manager-switch-'))
  roots.push(home)
  const dir = join(home, 'profiles', 'web')
  const plugin = join(dir, 'node_modules', 'demo-plugin')
  await mkdir(plugin, { recursive: true })
  await writeFile(join(plugin, 'package.json'), JSON.stringify({
    name: 'demo-plugin', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } }
  }))
  await writeFile(join(plugin, 'cordis.patch.yml'), '- insert:\n  - id: demo-row\n    name: demo-plugin\n')
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    dependencies: { 'demo-plugin': '1.0.0' },
    dsh: { profile: { bundles: ['demo-plugin'] } }
  }))
  return { home, dir }
}

/** Only the manager state the exercised methods read; the rest of Harness is not needed. */
function managerFor(home, dir) {
  const backend = createGenerationPackageBackend({
    dshHome: home,
    nodeExecutablePath: process.execPath,
    pnpmEntryPath: 'unused'
  })
  const services = new Map([['profileBundlePackageBackend', backend]])
  return {
    profile: { dir, name: 'web', installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json') },
    ownerContext: { get: name => services.get(name) },
    managementBundles: new Set(),
    protectsManager: () => false,
    declaredRows: () => ({ rows: [], overrides: [] }),
    bundleRows: () => [{ id: 'demo-row', name: 'demo-plugin' }]
  }
}

describe('Plugin Manager package switch', () => {
  it('lists a bundle the market switched off as disabled although it stays composable', async () => {
    const { home, dir } = await profileWithBundle()
    const manager = managerFor(home, dir)
    const listed = async () => (await PluginManager.prototype.listBundles.call(manager))
      .find(bundle => bundle.name === 'demo-plugin')

    expect(await listed()).toMatchObject({ enabled: true, installed: true })
    await mkdir(join(dir, '.dsh-market'), { recursive: true })
    await writeFile(join(dir, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['demo-plugin'], groups: [] }))
    expect(await listed()).toMatchObject({ enabled: false, installed: true })
  })

  it('persists its own toggle where launch reconciliation cannot revert it', async () => {
    const { home, dir } = await profileWithBundle()
    await writeFile(join(dir, 'cordis.patch.yml'), '- id: demo-row\n  disabled: false\n')
    const manager = managerFor(home, dir)

    await PluginManager.prototype.recordBundleSwitch.call(manager, 'demo-plugin', false)
    expect(await readDisabledPlugins(dir)).toEqual(['demo-plugin'])
    // The user's force-enable for the package's own row would contradict the switch.
    expect(await readFile(join(dir, 'cordis.patch.yml'), 'utf8')).toBe('[]\n')

    await PluginManager.prototype.recordBundleSwitch.call(manager, 'demo-plugin', true)
    expect(await readDisabledPlugins(dir)).toEqual([])
    const state = JSON.parse(await readFile(join(dir, '.dsh-market', 'state.json'), 'utf8'))
    expect(state).toEqual({ disabled: [] })
  })

  it('keeps market-owned fields when recording a switch', async () => {
    const { home, dir } = await profileWithBundle()
    await mkdir(join(dir, '.dsh-market'), { recursive: true })
    await writeFile(join(dir, '.dsh-market', 'state.json'), JSON.stringify({ disabled: [], groups: [{ id: 'g' }] }))
    await PluginManager.prototype.recordBundleSwitch.call(managerFor(home, dir), 'demo-plugin', false)
    expect(JSON.parse(await readFile(join(dir, '.dsh-market', 'state.json'), 'utf8')))
      .toEqual({ disabled: ['demo-plugin'], groups: [{ id: 'g' }] })
  })
})
