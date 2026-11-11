import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { SessionStore, SessionId } from '@deepseek-ai/dsh-session'
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection'
import { AgentRegistry, assembleContextFor } from '@deepseek-ai/dsh-agent'
import { AgentLoop } from '@deepseek-ai/dsh-agent-loop'
import { ToolRuntime, defineTool } from '@deepseek-ai/dsh-tools'
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native'
import { LlmRuntime, LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm'

const contexts = []
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose() })
const tool = name => defineTool({ name, description: name, parameters: {}, output: { schema: { type: 'null' }, render: () => [] }, execute: async () => null })
async function fixture() {
  const ctx = new Context(); contexts.push(ctx)
  for (const plugin of [SessionStore, SessionProjectionRegistry, AgentRegistry, SystemPrompt, ToolRuntime, NativeToolExecutor, LlmRuntime, AgentLoop]) await ctx.plugin(plugin)
  const requests = [], trace = []
  class Model extends LlmAdapter {
    async *stream(request) { requests.push(request); trace.push('model'); yield { type: 'text-delta', index: 0, text: 'done' }; yield { type: 'finish', reason: { kind: 'stop' } } }
  }
  ctx.llm.registerAdapter(['fixture'], new Model())
  const handle = await ctx.agents.create({ sessionId: SessionId('prepare-agent'), agentOptions: { provider: 'fixture', model: 'test' } })
  return { ctx, handle, requests, trace, async send() {
    handle.agent.followup(createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: 'question' }] }))
    await handle.agent.whenIdle()
  } }
}

it('waits for preparation before variables, sections, contexts and tool providers, and rejects cancelled direct calls', async () => {
  const ctx = new Context(); contexts.push(ctx); await ctx.plugin(SystemPrompt)
  const order = []
  ctx.on('system-prompt/prepare', async () => { await Promise.resolve(); order.push('prepare') })
  ctx.systemPrompt.variable('test', () => { order.push('variable'); return 'value' })
  ctx.systemPrompt.section({ name: 'test', order: 1, text: () => { order.push('section'); return '' } })
  ctx.systemPrompt.context({ name: 'test', order: 1, text: () => { order.push('context'); return '' } })
  ctx.systemPrompt.tools(() => { order.push('tools'); return { schemas: [] } })
  await ctx.systemPrompt.assemble()
  expect(order[0]).toBe('prepare')
  expect(order.slice(1).sort()).toEqual(['context', 'section', 'tools', 'variable'])
  order.length = 0
  const abort = new AbortController(); abort.abort()
  await expect(ctx.systemPrompt.assemble({ signal: abort.signal })).rejects.toThrow()
  expect(order).toEqual([])
})

it('uses a newly prepared tool in the first real AgentLoop request and prepares exactly once again on the next request', async () => {
  const f = await fixture()
  let dispose, count = 0
  f.ctx.on('system-prompt/prepare', async () => {
    await Promise.resolve(); count++; f.trace.push('prepare')
    dispose?.(); dispose = f.ctx.tools.register(tool('prepared_' + count))
  })
  f.ctx.on('agent/pre-step', async (_input, next) => { f.trace.push('pre-step'); return next() })
  await f.send()
  expect(f.requests[0].tools.map(row => row.name)).toEqual(['prepared_1'])
  expect(count).toBe(1)
  await f.send()
  expect(f.requests[1].tools.map(row => row.name)).toEqual(['prepared_2'])
  expect(count).toBe(2)
  expect(f.trace).toEqual(['prepare', 'pre-step', 'model', 'prepare', 'pre-step', 'model'])
})

it('never calls a model when preparation rejects and does not cache rejection into the next step', async () => {
  const f = await fixture(); let fail = true
  f.ctx.on('system-prompt/prepare', async () => { if (fail) throw new Error('fixture denied') })
  await f.send()
  expect(f.requests).toEqual([])
  fail = false
  await f.send()
  expect(f.requests).toHaveLength(1)
})

it('consumes opaque handles once and refuses context or scope reuse', async () => {
  const ctx = new Context(); contexts.push(ctx); await ctx.plugin(SystemPrompt)
  const prepare = vi.fn(async () => {})
  ctx.on('system-prompt/prepare', prepare)
  const context = {}, handle = await ctx.systemPrompt.prepare(context)
  await ctx.systemPrompt.assemble(context, handle)
  expect(prepare).toHaveBeenCalledTimes(1)
  await expect(ctx.systemPrompt.assemble(context, handle)).rejects.toThrow('preparation handle')
  const other = await ctx.systemPrompt.prepare(context)
  await expect(ctx.systemPrompt.assemble({}, other)).rejects.toThrow('preparation handle')
  await ctx.systemPrompt.assemble(context)
  expect(prepare).toHaveBeenCalledTimes(3)
})

it('scope-filters preparation listeners and stops invoking them after their owner unloads', async () => {
  const f = await fixture(), calls = vi.fn(async () => {})
  const owner = f.handle.agent.ctx.plugin({ apply(scope) { scope.on('system-prompt/prepare', calls) } })
  await owner
  await f.ctx.systemPrompt.assemble()
  expect(calls).not.toHaveBeenCalled()
  await f.ctx.systemPrompt.assemble(assembleContextFor(f.handle.agent))
  expect(calls).toHaveBeenCalledTimes(1)
  await owner.dispose()
  await f.ctx.systemPrompt.assemble(assembleContextFor(f.handle.agent))
  expect(calls).toHaveBeenCalledTimes(1)
})

it('rejects cancellation while preparation is pending before collecting any provider', async () => {
  const ctx = new Context(); contexts.push(ctx); await ctx.plugin(SystemPrompt)
  let entered, finish
  const started = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { finish = resolve })
  ctx.on('system-prompt/prepare', async () => { entered(); await gate })
  const collect = vi.fn(() => ({ schemas: [] }))
  ctx.systemPrompt.tools(collect)
  const abort = new AbortController(), pending = ctx.systemPrompt.assemble({ signal: abort.signal })
  await started
  abort.abort(); finish()
  await expect(pending).rejects.toThrow()
  expect(collect).not.toHaveBeenCalled()
})
