import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { z } from 'zod'
import remote from '@deepseek-ai/dsh-plugin-manager/remote'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { Loader } from '@deepseek-ai/cordis-plugin-loader'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'
import { TYPERT } from '@deepseek-ai/dsh-plugin-manager/typert'

const cleanup = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'manager-managed-source-'))
  cleanup.push(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } }))
  await mkdir(join(dir, 'host'))
  await writeFile(join(dir, 'host/package.json'), JSON.stringify({ dependencies: {} }))
  const ctx = new Context()
  const loader = ctx.plugin(Loader)
  await loader
  cleanup.push(() => loader.dispose())
  ctx.provide('profileContext', { dir, startedBundles: [], installAnchor: join(dir, 'host/package.json') })
  const managerFiber = ctx.plugin(PluginManager)
  await managerFiber
  cleanup.push(() => managerFiber.dispose())
  const change = vi.fn(async request => ({ target: 'managed:account:bundle', bundle: 'managed:account:bundle',
    stage: request.action === 'uninstall' ? 'remove' : 'enable', application: 'applied', changed: true, warnings: [] }))
  const source = { accepts: target => target.startsWith('managed:'), change,
    listBundles: () => [{ name: 'managed:account:bundle', official: false, availability: 'profile', enabled: true,
      installed: true, removable: true, optional: false, rows: [], overrides: [] }] }
  const owner = ctx.plugin(scope => { scope.provide('profileManagedBundleSource', source) })
  await owner
  cleanup.push(() => owner.dispose())
  return { ctx, manager: ctx.pluginManager, managerFiber, owner, source, change }
}

test('real scoped source supports inventory and managed install, enable, disable, remove with no pnpm', async () => {
  const { manager, change } = await fixture()
  const pnpm = vi.spyOn(manager, 'runPnpm').mockRejectedValue(new Error('unexpected package mutation'))
  expect(manager.managedBundleSourceContract).toBe(1)
  expect((await manager.listBundles()).find(row => row.name === 'managed:account:bundle')).toMatchObject({ managedSource: true, updatable: false, official: false })
  expect(await manager.installBundle('managed:account:ticket')).toMatchObject({ application: 'applied', changed: true })
  expect(await manager.setBundleEnabled('managed:account:bundle', false)).toMatchObject({ application: 'applied' })
  expect(await manager.setBundleEnabled('managed:account:bundle', true)).toMatchObject({ application: 'applied' })
  expect(await manager.removeBundle('managed:account:bundle')).toMatchObject({ application: 'applied' })
  expect(change.mock.calls.map(([request]) => request.action)).toEqual(['install', 'disable', 'enable', 'uninstall'])
  expect(pnpm).not.toHaveBeenCalled()
  expect(manager.listApplications()).toHaveLength(1)
})

test('source cannot claim ordinary registry/path/git packages or fabricate inventory identities', async () => {
  const { manager, source, change } = await fixture()
  source.accepts = () => true
  for (const target of ['ordinary-package', 'file:/tmp/package', 'https://example.invalid/pkg.tgz', 'github:owner/repo']) {
    expect(manager.managedSourceFor(target)).toBeUndefined()
  }
  source.listBundles = () => [{ name: 'ordinary-package' }]
  await expect(manager.listBundles()).rejects.toThrow(/identity/)
  expect(change).not.toHaveBeenCalled()
})

test('managed source cannot publish another source or ordinary package as its mutation identity', async () => {
  const { manager, change } = await fixture()
  change.mockResolvedValue({ application: 'applied', target: 'ordinary-package', bundle: 'ordinary-package', changed: true })
  expect(await manager.installBundle('managed:account:ticket')).toMatchObject({ application: 'failed', error: { diagnostic: expect.stringContaining('namespace') } })
})

test('provider disposal removes inventory and invalidates a stale managed operation', async () => {
  const { ctx, manager, owner, change } = await fixture()
  let started, finish
  const ready = new Promise(resolve => { started = resolve })
  const gate = new Promise(resolve => { finish = resolve })
  change.mockImplementation(async () => { started(); await gate; return { application: 'applied', changed: true } })
  const pending = manager.installBundle('managed:account:ticket')
  await ready
  let changes = 0
  ctx.on('plugin-manager/changed', () => { changes++ })
  await owner.dispose()
  expect((await manager.listBundles()).some(row => row.managedSource)).toBe(false)
  expect(changes).toBeGreaterThan(0)
  finish()
  expect(await pending).toMatchObject({ application: 'failed', error: { code: 'operation-error', diagnostic: expect.stringContaining('owner changed') } })
})

test('manager disposal cancels managed work and waits for its source to settle', async () => {
  const { manager, managerFiber, change } = await fixture()
  let started, finish, requestSignal
  const ready = new Promise(resolve => { started = resolve })
  const gate = new Promise(resolve => { finish = resolve })
  change.mockImplementation(async request => { requestSignal = request.signal; started(); await gate; return { application: 'applied', changed: true } })
  const pending = manager.installBundle('managed:account:ticket', { requestId: 'pending' })
  await ready
  let disposed = false
  const disposal = managerFiber.dispose().then(() => { disposed = true })
  await vi.waitFor(() => expect(requestSignal.aborted).toBe(true))
  expect(disposed).toBe(false)
  finish()
  expect(await pending).toMatchObject({ application: 'cancelled' })
  await disposal
  expect(disposed).toBe(true)
  expect(manager.packageOperations.size).toBe(0)
})

test('managed inventory classification survives the public Remote codec', async () => {
  const { manager } = await fixture()
  const method = TYPERT.invocations.find(invocation => invocation.method === 'listBundles')
  const row = (await method.result.create().parseAsync(await manager.listBundles())).find(row => row.name === 'managed:account:bundle')
  expect(row.managedSource).toBe(true)
  const values = await manager.listBundles()
  expect(remote.spec.methods['pluginManager/listBundles'].result.create().parse(values).find(row => row.managedSource)).toBeDefined()
  const bundle = readFileSync('node_modules/@deepseek-ai/dsh-api-remotes/lib/client.js', 'utf8')
  const start = bundle.indexOf('let _deepseek_ai_dsh_plugin_manager_pluginManager_listBundles_result$schema$value')
  const end = bundle.indexOf('let ', start + 4)
  const schema = vm.runInNewContext(bundle.slice(start, end) + '; _deepseek_ai_dsh_plugin_manager_pluginManager_listBundles_result$schema()', { zod: { z } })
  expect(schema.parse(values).find(row => row.managedSource)).toBeDefined()
  expect(schema.safeParse([{ ...row, managedSource: 'forged' }]).success).toBe(false)
})
