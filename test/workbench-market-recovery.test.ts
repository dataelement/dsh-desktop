import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMarketInstallStore } from '../packages/dsh-desktop-workbenches/market-install.mjs'
import { forgetRemovedWorkbenchMarketInstall } from '../src/main/state/workbench-market-recovery'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function home(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-market-recovery-'))
  roots.push(root)
  return root
}

describe('workbench market records after Profile recovery', () => {
  it('removes the recovered plugin record and keeps other installs', async () => {
    const dshHome = await home()
    const store = createMarketInstallStore(join(dshHome, 'desktop-workbenches'))
    await store.record('o/removed', { catalogId: 'o/removed', pluginName: 'removed', version: '1.0.0' })
    await store.record('o/kept', { catalogId: 'o/kept', pluginName: 'kept', version: '1.0.0' })
    const note = vi.fn()
    await forgetRemovedWorkbenchMarketInstall(dshHome, 'removed', note)
    expect(await store.read()).toEqual({ 'o/kept': { catalogId: 'o/kept', pluginName: 'kept', version: '1.0.0' } })
    expect(note).not.toHaveBeenCalled()
  })

  it('does not turn a completed recovery into a failure if the record cannot be read', async () => {
    const dshHome = await home()
    const root = join(dshHome, 'desktop-workbenches')
    await createMarketInstallStore(root).record('o/removed', { catalogId: 'o/removed', pluginName: 'removed', version: '1.0.0' })
    const file = join(root, 'market-installs.json')
    await writeFile(file, '{invalid json')
    const note = vi.fn()
    await expect(forgetRemovedWorkbenchMarketInstall(dshHome, 'removed', note)).resolves.toBeUndefined()
    expect(note).toHaveBeenCalledWith(expect.stringContaining('could not clear the workbench market install for removed'))
    expect(await readFile(file, 'utf8')).toBe('{invalid json')
  })

  it('does not create a market file when another plugin is removed', async () => {
    const dshHome = await home()
    const note = vi.fn()
    await forgetRemovedWorkbenchMarketInstall(dshHome, 'unrelated', note)
    await expect(stat(join(dshHome, 'desktop-workbenches', 'market-installs.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(note).not.toHaveBeenCalled()
  })
})
