import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { z } from 'zod'
import { TYPERT_REMOTE } from '@deepseek-ai/dsh-api-session-controller/remote'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { SessionSkillCatalog } from '@deepseek-ai/dsh-api-session-controller'
import { TYPERT } from '@deepseek-ai/dsh-api-session-controller/typert'
import { afterEach, expect, it, vi } from 'vitest'

const contexts = []
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose() })
async function registry() {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SkillRegistry, {})
  return ctx
}
const metadata = { name: 'remote-isolated-7', displayName: '合同审核', description: 'Review contract terms', source: 'fixture', invocation: { modelInvocable: true, userInvocable: true } }
it('preserves optional provider labels through actual registry discovery and loading without changing invocation keys', async () => {
  const ctx = await registry()
  ctx.skills.register({ name: 'local-skill', description: 'Local description', content: 'Local body', source: 'local' })
  ctx.skills.registerProvider(() => ({ name: 'fixture', list: async () => [{ ...metadata, provider: 'fixture', rank: 500, locator: 7 }], get: async candidate => ({ ...candidate, content: 'Remote body' }) }))
  const rows = await ctx.skills.list()
  expect(rows.find(row => row.name === metadata.name)).toMatchObject(metadata)
  expect(rows.find(row => row.name === 'local-skill')).not.toHaveProperty('displayName')
  expect(await ctx.skills.get(metadata.name)).toMatchObject({ ...metadata, content: 'Remote body' })
  expect((await ctx.skills.get('local-skill')).content).toBe('Local body')
})
it('preserves runtime labels and rejects malformed labels at runtime and provider boundaries', async () => {
  const ctx = await registry()
  ctx.skills.register({ ...metadata, content: 'Runtime body' })
  expect((await ctx.skills.list())[0]).toMatchObject(metadata)
  expect(() => ctx.skills.register({ ...metadata, name: 'invalid-label', displayName: 17, content: 'x' })).toThrow('displayName')
  ctx.skills.registerProvider(() => ({ name: 'bad', list: async () => [{ ...metadata, name: 'bad-label', displayName: 17, provider: 'bad', rank: 500, locator: null }], get: async () => undefined }))
  await expect(ctx.skills.list()).rejects.toThrow('displayName')
})
it('forwards optional labels through the actual cold-readable skill catalog and generated host codec', async () => {
  const ctx = await registry()
  ctx.skills.register({ ...metadata, content: 'Body' })
  ctx.skills.register({ name: 'builtin-skill', description: 'Builtin', content: 'Body', source: 'local' })
  const dispose = vi.fn(), release = vi.fn(), ensure = vi.fn()
  const host = { scopeFor: vi.fn(async () => ({ key: undefined, [Symbol.asyncDispose]: release })), ctx: {
    sessionQuery: { observeSession: async () => ({ projections: { values: { workingDirectory: '/fixture' } }, header: {}, [Symbol.dispose]: dispose }) },
    agents: { get: () => undefined }, workingDirectory: { ensure },
    get: name => name === 'skills' ? ctx.skills : undefined
  } }
  const value = await SessionSkillCatalog.prototype.list.call(host, { sessionId: 'fixture-session' }, new AbortController().signal)
  expect(value.skills.find(row => row.name === metadata.name)).toMatchObject({ name: metadata.name, displayName: metadata.displayName, description: metadata.description })
  expect(value.skills.find(row => row.name === 'builtin-skill')).not.toHaveProperty('displayName')
  expect(dispose).toHaveBeenCalledOnce()
  expect(release).toHaveBeenCalledOnce()
  expect(host.scopeFor).toHaveBeenCalledOnce()
  expect(ensure).not.toHaveBeenCalled()
  const descriptor = TYPERT.invocations.find(item => item.method === 'list' && item.namespace === 'skills')
  expect(descriptor).toBeDefined()
  expect(descriptor.result.create().parse(value)).toEqual(value)
  const remoteDescriptor = TYPERT_REMOTE.descriptors.find(item => item.method === 'list' && item.namespace === 'skills')
  expect(remoteDescriptor.result.create().parse(value)).toEqual(value)
  const bundle = readFileSync('node_modules/@deepseek-ai/dsh-api-remotes/lib/client.js', 'utf8')
  const start = bundle.indexOf('let _deepseek_ai_dsh_api_session_controller_skills_list_result$schema$value')
  const end = bundle.indexOf('let _deepseek_ai_dsh_api_session_controller_fileReferences_list_parameter_0_strict$schema$value', start)
  expect(start).toBeGreaterThanOrEqual(0)
  const schema = vm.runInNewContext(bundle.slice(start, end) + '; _deepseek_ai_dsh_api_session_controller_skills_list_result$schema()', { zod: { z } })
  expect(schema.parse(value)).toEqual(value)
  expect(descriptor.result.create().safeParse({ skills: [{ ...value.skills[0], displayName: 17 }] }).success).toBe(false)
})
