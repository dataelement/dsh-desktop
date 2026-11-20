import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { Loader } from '@deepseek-ai/cordis-plugin-loader'
import { boot, mountRootInclude, reconcileProfilePatches } from '@deepseek-ai/dsh-app-boot'

const cleanup = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'root-runtime-layer-'))
  cleanup.push(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'cordis.yml'), '[]')
  const ctx = new Context()
  const loader = ctx.plugin(Loader, { baseUrl: pathToFileURL(dir + '/').href })
  await loader
  cleanup.push(() => loader.dispose())
  ctx.loader.builtins.noop = { apply() {} }
  const base = [{ insert: [{ id: 'base', name: 'cordis:noop' }] }]
  await mountRootInclude(ctx, join(dir, 'cordis.yml'), base)
  await ctx.loader.await()
  const entry = id => [...ctx.loader.entries()].find(row => row.options.id === id)
  return { ctx, loader, dir, base, entry }
}

test('runtime overlays share the root Include and survive public base recomposition', async () => {
  const { ctx, base, entry } = await fixture()
  await ctx.profileRuntimeLayers.set('overlay', [{ id: 'base', disabled: true }, { insert: [{ id: 'extra', name: 'cordis:noop' }] }], ['extra'])
  expect(entry('extra').parent).toBe(entry('base').parent)
  await reconcileProfilePatches(ctx, [...base, { insert: [{ id: 'user', name: 'cordis:noop' }] }], 'test')
  expect(entry('extra').fiber.state).toBe(2)
  await ctx.profileRuntimeLayers.remove('overlay')
  expect(entry('extra')).toBeUndefined()
  expect(entry('base').fiber.state).toBe(2)
  expect(entry('user').fiber.state).toBe(2)
})

test('failed activation restores the prior composition and preserves original failure identity', async () => {
  const { ctx, entry } = await fixture()
  const cause = new Error('original plugin cause')
  ctx.loader.builtins.fail = { apply() { throw cause } }
  let failure
  try { await ctx.profileRuntimeLayers.set('bad', [{ id: 'base', disabled: true }, { insert: [{ id: 'bad', name: 'cordis:fail' }] }], ['bad']) }
  catch (error) { failure = error }
  expect(failure).toBeDefined()
  expect(failure.cause.errors).toContain(cause)
  expect(entry('bad')).toBeUndefined()
  expect(entry('base').fiber.state).toBe(2)
})

test('owner disposal inside root reconciliation never deadlocks and removes only owned layers', async () => {
  const { ctx, base, entry } = await fixture()
  let owner
  ctx.loader.builtins.owner = { apply(scope) { owner = scope } }
  await reconcileProfilePatches(ctx, [...base, { insert: [{ id: 'owner', name: 'cordis:owner' }] }], 'test')
  const layers = ctx.profileRuntimeLayers.for(owner)
  await layers.set('owned', [{ id: 'base', disabled: true }, { insert: [{ id: 'owned', name: 'cordis:noop' }] }], ['owned'])
  await ctx.profileRuntimeLayers.set('unrelated', [{ insert: [{ id: 'unrelated', name: 'cordis:noop' }] }], ['unrelated'])
  await expect(ctx.profileRuntimeLayers.for(ctx.extend()).set('owned', [])).rejects.toThrow(/another owner/)
  await reconcileProfilePatches(ctx, base, 'test')
  await ctx.profileRuntimeLayers.remove('barrier')
  expect(entry('owner')).toBeUndefined()
  expect(entry('owned')).toBeUndefined()
  expect(entry('base').fiber.state).toBe(2)
  expect(entry('unrelated').fiber.state).toBe(2)
  await expect(layers.set('stale', [])).rejects.toThrow(/disposed/)
})

test('the actual root Include lifetime expires runtime capabilities without shutdown restoration', async () => {
  const { ctx, loader } = await fixture()
  let owner
  ctx.loader.builtins.owner = { apply(scope) { owner = scope } }
  await reconcileProfilePatches(ctx, [{ insert: [{ id: 'owner', name: 'cordis:owner' }] }], 'test')
  const scope = ctx.profileRuntimeLayers.for(owner)
  await scope.set('owned', [{ insert: [{ id: 'runtime', name: 'cordis:noop' }] }], ['runtime'])
  await loader.dispose()
  await expect(scope.set('late', [])).rejects.toThrow(/disposed/)
})

test('boot prepare can stage root layers and preparation failure disposes its effects with original cause', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'root-prepare-layer-'))
  cleanup.push(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'cordis.yml'), '[]')
  let disposed = false
  const cause = new Error('prepare rejected')
  let failure
  try {
    await boot('test', join(dir, 'cordis.yml'), [], async ctx => {
      expect(ctx.profileRuntimeLayers).toBeDefined()
      ctx.effect(() => () => { disposed = true }, 'test prepare cleanup')
      await ctx.profileRuntimeLayers.set('prepared', [])
      throw cause
    })
  } catch (error) { failure = error }
  expect(failure.cause).toBe(cause)
  expect(disposed).toBe(true)
})
