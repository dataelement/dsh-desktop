import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { createDevelopmentRepairDemo, DEMO_PLUGIN } from '../src/main/development-repair-demo'

const roots: string[] = []
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function setup() {
  vi.stubEnv('DSH_DEV_REPAIR_DEMO', '1')
  const root = await realpath(await mkdtemp(join(tmpdir(), 'repair-demo-test-')))
  roots.push(root)
  const home = join(root, 'repair-demo-013')
  const dir = join(home, 'profiles', 'web')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } }))
  const note = vi.fn()
  const restartNormal = vi.fn(async () => {})
  const options = { enabled: true, profile: 'repair-demo-013', dshHome: home, restartNormal, showUnknownRecovery: vi.fn(async () => {}), openNormalRepair: vi.fn(async () => {}), openSafeRepair: vi.fn(async () => {}), note }
  return { home, dir, options, demo: createDevelopmentRepairDemo(options)! }
}
async function click(demo: NonNullable<ReturnType<typeof createDevelopmentRepairDemo>>, index: number) {
  // Electron supplies these arguments at runtime; menu actions deliberately do not inspect them.
  await demo.menu[index]!.click?.({} as Electron.MenuItem, undefined, {} as Electron.KeyboardEvent)
}
it('requires explicit flag and dedicated named Profile path', async () => {
  const { options } = await setup()
  expect(createDevelopmentRepairDemo({ ...options, enabled: false })).toBeUndefined()
  expect(createDevelopmentRepairDemo({ ...options, profile: 'desktop' })).toBeUndefined()
  expect(createDevelopmentRepairDemo({ ...options, dshHome: '/normal-home' })).toBeUndefined()
  vi.stubEnv('DSH_DEV_REPAIR_DEMO', '0')
  expect(createDevelopmentRepairDemo(options)).toBeUndefined()
})
it('installs real throwing plugin, simulates upgrade and disables reversibly', async () => {
  const { home, dir, demo, options } = await setup()
  await click(demo, 0)
  expect(options.note).not.toHaveBeenCalled()
  expect(options.restartNormal).toHaveBeenCalledOnce()
  const first = await demo.checkPlugin(DEMO_PLUGIN)
  expect(first?.upgradeCandidate?.targetVersion).toBe('2.0.0')
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  expect(manifest.dsh.profile.bundles).toContain(DEMO_PLUGIN)
  const source = await readFile(join(dir, 'node_modules', DEMO_PLUGIN, 'index.js'), 'utf8')
  const fixture = await import(`data:text/javascript,${encodeURIComponent(source)}`)
  expect(() => fixture.apply()).toThrow('[DEMO]')
  expect(await demo.upgradePlugin(first!.upgradeCandidate!)).toMatchObject({ ok: true })
  expect((await demo.checkPlugin(DEMO_PLUGIN))?.upgradeCandidate).toBeUndefined()
  await click(demo, 2)
  expect(JSON.parse(await readFile(join(dir, '.dsh-market', 'state.json'), 'utf8')).disabled).toContain(DEMO_PLUGIN)
  expect(await readFile(join(dir, 'node_modules', DEMO_PLUGIN, 'index.js'), 'utf8')).toBe(source)
  expect(await demo.checkPlugin('ordinary-user-plugin')).toBeUndefined()
  expect(await demo.upgradePlugin({ packageName: 'ordinary-user-plugin', targetVersion: '2.0.0' })).toBeUndefined()
  await writeFile(join(home, 'repair-journal.json'), JSON.stringify({ attempts: [{ key: 'demo', action: 'disable', plugins: [DEMO_PLUGIN], status: 'failed', createdAt: 'now' }, { key: 'keep', action: 'disable', plugins: ['other'], status: 'failed', createdAt: 'now' }] }))
  await click(demo, 0)
  expect(JSON.parse(await readFile(join(home, 'repair-journal.json'), 'utf8')).attempts.map((entry: { key: string }) => entry.key)).toEqual(['keep'])
})
it('refuses same-name user package and linked node_modules', async () => {
  const { dir, demo, options, home } = await setup()
  const fixture = join(dir, 'node_modules', DEMO_PLUGIN)
  await mkdir(fixture, { recursive: true })
  await writeFile(join(fixture, 'package.json'), '{"name":"user-owned"}')
  await click(demo, 0)
  expect(options.restartNormal).not.toHaveBeenCalled()
  expect(await readFile(join(fixture, 'package.json'), 'utf8')).toBe('{"name":"user-owned"}')
  await rm(join(dir, 'node_modules'), { recursive: true })
  const outside = join(home, 'external')
  await mkdir(outside)
  await symlink(outside, join(dir, 'node_modules'), 'dir')
  await click(demo, 0)
  expect(options.restartNormal).not.toHaveBeenCalled()
  expect(options.note).toHaveBeenLastCalledWith(expect.stringContaining('symlink'))
})
it('routes explicit preview and Agent actions without installing a fault', async () => {
  const { demo, options } = await setup()
  await click(demo, 1)
  expect(options.note).toHaveBeenCalledWith(expect.stringContaining('并非实际发生'))
  expect(options.showUnknownRecovery).toHaveBeenCalledOnce()
  await click(demo, 3)
  await click(demo, 4)
  expect(options.openNormalRepair).toHaveBeenCalledOnce()
  expect(options.openSafeRepair).toHaveBeenCalledOnce()
})
it('arms rollback simulations only in guarded demo and preserves fixture on failure', async () => {
  const { demo, dir } = await setup()
  expect(demo.rollbackTarget()).toBeUndefined()
  await expect(demo.simulateRollback()).rejects.toThrow('not armed')
  await click(demo, 6)
  expect(demo.rollbackTarget()).toBe('0.12.0')
  await expect(demo.simulateRollback()).rejects.toThrow('回退失败')
  expect((await demo.checkPlugin(DEMO_PLUGIN))?.upgradeCandidate).toBeDefined()
  await click(demo, 5)
  await demo.simulateRollback()
  expect(JSON.parse(await readFile(join(dir, '.dsh-market', 'state.json'), 'utf8')).disabled).toContain(DEMO_PLUGIN)
  expect(demo.rollbackTarget()).toBeUndefined()
})
