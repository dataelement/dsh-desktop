import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { TypertCodec } from '@deepseek-ai/dsh-typert-protocol'
import { Context } from '@deepseek-ai/cordis'
import * as gateway from '../node_modules/@deepseek-ai/dsh-api-gateway/lib/types/client/index.js'
import * as registry from '../node_modules/@deepseek-ai/dsh-typert-registry/lib/types/client/index.js'
import sessionRemote from '@deepseek-ai/dsh-api-session-controller/remote'
import { describe, expect, it, vi } from 'vitest'

// Load the browser assembly itself: its inlined descriptors can drift from
// session-controller/remote even when the Host and TypeScript declarations agree.
async function browserRemotes() {
  const source = await readFile(path.resolve('node_modules/@deepseek-ai/dsh-api-remotes/lib/client.js'), 'utf8')
  let plugin!: { apply(ctx: unknown): Promise<() => Promise<void>> }
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load(definition: { factory(require: unknown): typeof plugin }) {
      plugin = definition.factory((id: string) => { throw new Error(`Unexpected dependency: ${id}`) })
    } } }
  })
  return plugin
}

function accepts(codec: TypertCodec, value: unknown) {
  if (codec.mode !== 'strict') throw new Error('Expected strict Remote codec')
  try { codec.schema.parse(value); return true } catch { return false }
}

describe('browser session deletion Remote', () => {
  it('registers the deletion contract and sends the request through the real gateway', async () => {
    const ctx = new Context()
    const call = vi.fn().mockResolvedValue({ ok: true, value: { deleted: true } })
    ctx.provide('connection', {
      rpc: { call, open: vi.fn() },
      start: () => ({ stop() {} }),
      registerGenerationSource: () => () => {},
      generation: { getSnapshot: () => undefined }
    })
    const registryFiber = await ctx.plugin(registry)
    const gatewayFiber = await ctx.plugin(gateway)
    const plugin = await browserRemotes()
    let dispose: (() => Promise<void>) | undefined
    try {
      dispose = await plugin.apply(ctx)
      expect(typeof ctx.remote.session.delete).toBe('function')
      const request = { sessionId: SessionId('delete-regression-session') }
      await expect(ctx.remote.session.delete(request)).resolves.toEqual({ ok: true, value: { deleted: true } })
      expect(call).toHaveBeenCalledWith('/api', 'session/delete', { args: { request } }, expect.any(AbortSignal))
      call.mockResolvedValueOnce({ ok: false, error: { code: 'SESSION_BUSY', message: 'Session is running' } })
      await expect(ctx.remote.session.delete(request)).resolves.toMatchObject({ ok: false, error: { code: 'SESSION_BUSY' } })
    } finally {
      await dispose?.()
      await gatewayFiber.dispose()
      await registryFiber.dispose()
    }
  })

  it('keeps browser deletion codecs aligned with the standalone Remote contribution', async () => {
    const contributions: Array<typeof sessionRemote> = []
    await (await browserRemotes()).apply({ remote: { $mount: async (value: typeof sessionRemote) => {
      contributions.push(value)
      return async () => {}
    } } })
    const browser = contributions.flatMap(value => value.descriptors).find(value => value.namespace === 'session' && value.method === 'delete')
    const standalone = sessionRemote.descriptors.find(value => value.namespace === 'session' && value.method === 'delete')!
    expect(browser).toBeDefined()
    expect(browser!.id).toBe(standalone.id)
    for (const value of [{ sessionId: 'one' }, {}, { sessionId: 12 }]) {
      expect(accepts(browser!.parameters[0]!.codec, value)).toBe(accepts(standalone.parameters[0]!.codec, value))
    }
    for (const value of [{ deleted: true }, { deleted: false }, {}]) {
      expect(accepts(browser!.result, value)).toBe(accepts(standalone.result, value))
    }
  })
})
