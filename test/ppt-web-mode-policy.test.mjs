import { afterEach, expect, it, vi } from 'vitest'
import { assembleContextFor } from '@deepseek-ai/dsh-agent'
import { policyRuntime } from './helpers/ppt-policy-agents.mjs'
import { installWebModePolicy } from '../packages/ppt-runtime/core/lib/web-mode-policy.js'

const cleanups = []
afterEach(async () => { for (const dispose of cleanups.splice(0).reverse()) await dispose() })
async function fixture({ office = true } = {}) {
  const runtime = await policyRuntime(cleanups), { root } = runtime
  let body = 'original office body', cwd = '/tmp/ppt-web-policy'
  if (office) root.skills.registerProvider(() => ({
    name: 'office',
    async list() { return [{ name: 'office-pptx', description: 'Ordinary PPT', provider: 'office', source: 'bundled', rank: 100, locator: 'pptx', invocation: { modelInvocable: true, userInvocable: true } }] },
    async get() { return { name: 'office-pptx', description: 'Ordinary PPT', content: body, source: 'bundled', provider: 'office', invocation: { modelInvocable: true, userInvocable: true } } }
  }))
  const active = new Set()
  const ensure = vi.fn(async () => cwd)
  const stop = installWebModePolicy({ effect: root.effect.bind(root), on: root.on.bind(root), workingDirectory: { ensure } }, { state: async id => ({ presentationMode: active.has(id) ? 'ppt' : undefined }) })
  cleanups.push(stop)
  return { ...runtime, active, stop, ensure,
    body: value => { body = value }, cwd: value => { cwd = value },
    get: agent => root.skills.get('office-pptx', { scope: agent, cwd }),
    step: (agent, signal) => root.systemPrompt.assemble(assembleContextFor(agent, signal))
  }
}
it('applies policy before prompt tool collection and restores only the Agent leaving PPT mode', async () => {
  const f = await fixture(), a = await f.agent(), b = await f.agent()
  const observed = new Map()
  f.root.on('system-prompt/prepare', async ({ agent }) => { observed.set(agent.id, (await f.get(agent)).invocation) })
  const seen = []
  f.root.systemPrompt.tools(({ agent }) => { seen.push(observed.get(agent.id)); return { schemas: [] } })
  f.active.add(a.id)
  await f.step(a)
  expect(seen.at(-1)).toEqual({ modelInvocable: false, userInvocable: true })
  expect((await f.get(b)).invocation.modelInvocable).toBe(true)
  f.active.delete(a.id)
  await f.step(a)
  expect(seen.at(-1).modelInvocable).toBe(true)
})
it('refreshes source bodies and workspaces on each preparation and unregisters on plugin teardown', async () => {
  const f = await fixture(), a = await f.agent()
  f.active.add(a.id)
  await f.step(a)
  expect((await f.get(a)).content).toBe('original office body')
  f.body('updated office body'); f.cwd('/tmp/ppt-web-policy-next')
  await f.step(a)
  expect((await f.get(a)).content).toBe('updated office body')
  expect(f.ensure).toHaveBeenCalledTimes(2)
  f.stop()
  expect((await f.get(a)).invocation.modelInvocable).toBe(true)
})
it('permits a Profile with no ordinary Office skill', async () => {
  const f = await fixture({ office: false }), a = await f.agent()
  f.active.add(a.id)
  await expect(f.step(a)).resolves.toBeDefined()
  expect(await f.get(a)).toBeUndefined()
})
it('rejects cancellation before tool resolution and retries on the next preparation', async () => {
  const f = await fixture(), a = await f.agent(), collect = vi.fn(() => ({ schemas: [] }))
  f.root.systemPrompt.tools(collect)
  f.active.add(a.id)
  const abort = new AbortController(); abort.abort(new Error('cancel refresh'))
  await expect(f.step(a, abort.signal)).rejects.toThrow('cancel refresh')
  expect(collect).not.toHaveBeenCalled()
  await f.step(a)
  expect((await f.get(a)).invocation.modelInvocable).toBe(false)
  expect(collect).toHaveBeenCalledOnce()
})
it('rejects mismatched assembly identities and ignores agentless assemblies', async () => {
  const f = await fixture(), a = await f.agent(), b = await f.agent()
  await expect(f.root.systemPrompt.assemble({ agent: a, scope: b })).rejects.toThrow('matching Agent')
  await expect(f.root.systemPrompt.assemble()).resolves.toBeDefined()
  expect(f.ensure).not.toHaveBeenCalled()
})
