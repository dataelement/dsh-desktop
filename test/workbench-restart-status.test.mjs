import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRestartStatus, readLocalWorkbenchSnapshot } from '../packages/dsh-desktop-workbenches/restart-status.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'workbench-restart-'))
  roots.push(home)
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
  async function install(name, overrides = {}) {
    const directory = join(profile, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { [name]: 'file:./local-workbench' } }))
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name, version: '1.0.0', exports: { './client': './client.js' },
      dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } }, ...overrides }))
    await writeFile(join(directory, 'client.js'), 'initial workbench')
    await writeFile(join(directory, 'cordis.patch.yml'), 'plugins: []')
    return directory
  }
  return { home, profile, install }
}

describe('local workbench restart detection', () => {
  it('ignores existing installed packages and detects a new local install without an Agent API', async () => {
    const { home, install } = await fixture()
    const directory = await install('my-workbench')
    const status = createRestartStatus(() => readLocalWorkbenchSnapshot(home), { minimumInterval: 0 })
    expect(await status.read()).toEqual({ restartRequired: false, packages: [] })
    await writeFile(join(directory, 'client.js'), 'updated workbench, unchanged version')
    expect(await status.read()).toEqual({ restartRequired: true, packages: ['my-workbench'] })
    // Page refreshes read the same host instance; no client-local flag is required.
    expect(await status.read()).toEqual({ restartRequired: true, packages: ['my-workbench'] })
    // A new Harness process loads current code and establishes a fresh baseline.
    const restarted = createRestartStatus(() => readLocalWorkbenchSnapshot(home), { minimumInterval: 0 })
    expect(await restarted.read()).toEqual({ restartRequired: false, packages: [] })
  })

  it('captures the baseline before the first browser read and latches until restart', async () => {
    const { home, install, profile } = await fixture()
    let capture
    const captured = new Promise(resolve => { capture = resolve })
    let initial = true
    const status = createRestartStatus(async () => {
      const snapshot = await readLocalWorkbenchSnapshot(home)
      if (initial) { initial = false; capture() }
      return snapshot
    }, { minimumInterval: 0 })
    await captured
    await install('new-workbench')
    expect(await status.read()).toEqual({ restartRequired: true, packages: ['new-workbench'] })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
    expect((await status.read()).restartRequired).toBe(true)
  })

  it('rejects ordinary plugins, missing packages, incomplete installs and package traversal', async () => {
    const { home, install, profile } = await fixture()
    await install('ordinary-plugin', { dsh: { client: { platform: 'web' } } })
    expect(await readLocalWorkbenchSnapshot(home)).toEqual({})
    const directory = await install('incomplete-workbench')
    await rm(join(directory, 'client.js'))
    expect(await readLocalWorkbenchSnapshot(home)).toEqual({})
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { absent: 'file:./missing', '../escape': 'file:./escape' } }))
    expect(await readLocalWorkbenchSnapshot(home)).toEqual({})
  })

  it('discovers a desired local generation and ignores unrelated market receipts', async () => {
    const { home, install } = await fixture()
    const source = await install('generation-workbench')
    const generation = join(home, 'profiles', '.generations', 'live', 'local-1')
    const { cp } = await import('node:fs/promises')
    await mkdir(join(generation, 'node_modules'), { recursive: true })
    await cp(source, join(generation, 'node_modules', 'generation-workbench'), { recursive: true })
    await writeFile(join(generation, 'generation.json'), JSON.stringify({ pluginName: 'generation-workbench', sourceSpec: 'file:./generation' }))
    await writeFile(join(home, 'profiles', '.generations', 'desired.json'), JSON.stringify(['local-1', '../escape']))
    const snapshot = await readLocalWorkbenchSnapshot(home, { other: { pluginName: 'unrelated-market-package', version: '1.0.0' } })
    expect(Object.keys(snapshot)).toEqual(['generation-workbench'])
    expect(snapshot['generation-workbench']).toMatch(/^v2:/)
  })

  it('accepts a package-relative patch path without a dot prefix', async () => {
    const { home, install } = await fixture()
    await install('plain-patch-workbench', {
      dsh: { bundle: { patch: 'cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } }
    })
    expect(Object.keys(await readLocalWorkbenchSnapshot(home))).toEqual(['plain-patch-workbench'])
  })

  it('detects a local archive replacing a market package despite its stale receipt', async () => {
    const { home, profile, install } = await fixture()
    const directory = await install('archive-workbench')
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { 'archive-workbench': 'file:./workbench.tgz' } }))
    const initial = await readLocalWorkbenchSnapshot(home)
    const receipts = { market: { pluginName: 'archive-workbench', version: '1.0.0', source: 'github-release', fingerprint: initial['archive-workbench'] } }
    expect(await readLocalWorkbenchSnapshot(home, receipts)).toEqual({})
    await writeFile(join(directory, 'client.js'), 'developer replaced the installed archive')
    expect(Object.keys(await readLocalWorkbenchSnapshot(home, receipts))).toEqual(['archive-workbench'])
  })

  it('throttles scans across clients while retaining the host status', async () => {
    let calls = 0
    const status = createRestartStatus(async () => { calls++; return {} }, { minimumInterval: 10000 })
    await status.read()
    await status.read()
    await status.read()
    expect(calls).toBe(2) // Startup baseline plus one shared scan.
  })

  it('coalesces concurrent reads and reports baseline failures instead of inventing installs', async () => {
    let calls = 0
    const status = createRestartStatus(async () => { calls++; return {} })
    const first = status.read()
    expect(status.read()).toBe(first)
    expect(await first).toEqual({ restartRequired: false, packages: [] })
    expect(calls).toBe(2)
    const broken = createRestartStatus(async () => { throw new Error('unreadable profile') })
    await expect(broken.read()).rejects.toThrow('unreadable profile')
  })
})

it('acknowledges only a managed applied package and still detects subsequent external edits', async () => {
  let snapshot = { local: 'old', other: 'old' }
  const status = createRestartStatus(async () => ({ ...snapshot }), { minimumInterval: 0 })
  await status.read()
  snapshot = { local: 'new', other: 'changed' }
  expect((await status.read()).packages).toEqual(['local', 'other'])
  await status.acknowledge('local')
  expect((await status.read()).packages).toEqual(['other'])
  snapshot.local = 'edited-after-install'
  expect((await status.read()).packages).toEqual(['other', 'local'])
})
