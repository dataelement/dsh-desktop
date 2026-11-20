import { afterEach, expect, it } from 'vitest'
import { policyRuntime } from './helpers/ppt-policy-agents.mjs'
import { isModelInvocable, isUserInvocable } from '@deepseek-ai/dsh-skill'
import { createOfficePptxScopePolicyController, registerOfficePptxScopePolicy } from '../packages/ppt-runtime/core/lib/office-pptx-scope-policy.js'

const cleanups = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function fixture({ missing = false, load } = {}) {
  const runtime = await policyRuntime(cleanups)
  const { root } = runtime
  const definition = {
    name: 'office-pptx', description: 'Original PowerPoint workflow',
    content: '# PPTX workflow\n\nRetain original body and references.\n',
    provider: 'original-office', source: 'bundled',
    invocation: { modelInvocable: true, userInvocable: true },
    resourceBase: { kind: 'directory', path: '/tmp/office-policy-fixture' },
    metadata: { workflow: 'pptx' },
  }
  let lists = 0
  root.skills.registerProvider(() => ({
    name: definition.provider,
    async list() {
      lists++
      return missing ? [] : [{ ...definition, rank: 600, locator: 'pptx' }]
    },
    async get() { return load ? await load(definition) : definition },
  }))
  const a = await runtime.agent(), b = await runtime.agent()
  const sa = { ctx: a.ctx, dispose: () => runtime.dispose(a) }, sb = { ctx: b.ctx, dispose: () => runtime.dispose(b) }
  return { root, a, b, sa, sb, runtime, definition, lists: () => lists,
    get: scope => root.skills.get('office-pptx', { scope }),
    list: scope => root.skills.list({ scope }),
  }
}

it('preserves an existing prohibition on user invocation', async () => {
  const f = await fixture()
  f.definition.invocation.userInvocable = false
  const policy = await registerOfficePptxScopePolicy(f.a)
  expect((await f.get(f.a)).invocation).toEqual({ modelInvocable: false, userInvocable: false })
  policy.dispose()
  expect((await f.get(f.a)).invocation.userInvocable).toBe(false)
})

it('shadows only the registered agent, including already cached catalogs, and preserves the body', async () => {
  const f = await fixture()
  await f.list(f.a); await f.list(f.b); await f.list()
  const cached = f.lists()
  await f.list(f.a); await f.list(f.b); await f.list()
  expect(f.lists()).toBe(cached)
  const policy = await registerOfficePptxScopePolicy(f.a)
  const selected = await f.get(f.a)
  expect(isModelInvocable(selected)).toBe(false)
  expect(isUserInvocable(selected)).toBe(true)
  expect(selected).toMatchObject({ ...f.definition,
    provider: 'dsh-ppt-office-pptx-scope-policy',
    invocation: { modelInvocable: false, userInvocable: true },
  })
  expect((await f.list(f.a))[0].invocation.modelInvocable).toBe(false)
  expect(isModelInvocable(await f.get(f.b))).toBe(true)
  expect(await f.get()).toEqual(f.definition)
  policy.dispose(); policy.dispose()
  expect(await f.get(f.a)).toEqual(f.definition)
  expect((await f.list(f.a))[0].invocation.modelInvocable).toBe(true)
})

it('registers two agents independently and restores each on explicit or scope teardown', async () => {
  const f = await fixture()
  const a = await registerOfficePptxScopePolicy(f.a)
  const b = await registerOfficePptxScopePolicy(f.b)
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  expect(isModelInvocable(await f.get(f.b))).toBe(false)
  a.dispose()
  expect(isModelInvocable(await f.get(f.a))).toBe(true)
  expect(isModelInvocable(await f.get(f.b))).toBe(false)
  const next = await registerOfficePptxScopePolicy(f.a)
  a.dispose()
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  next.dispose()
  await f.sb.dispose()
  expect(isModelInvocable(await f.get(f.b))).toBe(true)
  b.dispose()
})

it('rejects global and duplicate registration without disturbing a live policy', async () => {
  const f = await fixture()
  await expect(registerOfficePptxScopePolicy(f.root)).rejects.toThrow('requires a live agent scope')
  const policy = await registerOfficePptxScopePolicy(f.a)
  await expect(registerOfficePptxScopePolicy(f.a)).rejects.toThrow('already registered')
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  policy.dispose()
})

it('fails visibly for missing sources and permits retry after failure', async () => {
  const f = await fixture({ missing: true })
  await expect(registerOfficePptxScopePolicy(f.a)).rejects.toThrow('source skill is unavailable')
  await expect(registerOfficePptxScopePolicy(f.a)).rejects.toThrow('source skill is unavailable')
  expect(await f.get()).toBeUndefined()
})

it('does not install a late result after the agent scope is disposed', async () => {
  let release, entered
  const ready = new Promise(resolve => { entered = resolve })
  const pending = new Promise(resolve => { release = resolve })
  const f = await fixture({ load: async definition => { entered(); await pending; return definition } })
  const registration = registerOfficePptxScopePolicy(f.a)
  const assertion = expect(registration).rejects.toThrow('scope disposed during loading')
  await ready
  await f.sa.dispose()
  release()
  await assertion
  expect(await f.get(f.a)).toEqual(f.definition)
})

it('honors cancellation and removes the failed registration reservation', async () => {
  const f = await fixture()
  const controller = new AbortController()
  controller.abort(new Error('cancel policy'))
  await expect(registerOfficePptxScopePolicy(f.a, { signal: controller.signal })).rejects.toThrow('cancel policy')
  const policy = await registerOfficePptxScopePolicy(f.a)
  policy.dispose()
})

it('refreshes provider body changes each active step and cleans up repeated mode toggles', async () => {
  let body = 'version one'
  const f = await fixture({ load: definition => ({ ...definition, content: body }) })
  const controller = createOfficePptxScopePolicyController()
  cleanups.push(() => controller.dispose())
  await controller.sync(f.a, { active: true, cwd: '/tmp/first' })
  expect((await f.get(f.a)).content).toBe('version one')
  body = 'version two'
  await controller.sync(f.a, { active: true, cwd: '/tmp/second' })
  expect((await f.get(f.a)).content).toBe('version two')
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  for (let i = 0; i < 5; i++) {
    await controller.sync(f.a, { active: false })
    expect(isModelInvocable(await f.get(f.a))).toBe(true)
    await controller.sync(f.a, { active: true })
  }
  await controller.sync(f.b, { active: true })
  await f.sa.dispose()
  expect(isModelInvocable(await f.get(f.a))).toBe(true)
  expect(isModelInvocable(await f.get(f.b))).toBe(false)
  controller.dispose(); controller.dispose()
  expect(isModelInvocable(await f.get(f.b))).toBe(true)
  await expect(controller.sync(f.b, { active: true })).rejects.toThrow('controller is disposed')
})

it('preserves the current same-agent source and wins over its normal provider rank', async () => {
  const f = await fixture()
  const source = { ...f.definition, provider: 'agent-source', content: 'agent override' }
  f.sa.ctx.get('skills').registerProvider(() => ({
    name: source.provider,
    async list() { return [{ ...source, rank: 0, locator: 'agent' }] },
    async get() { return source },
  }))
  const controller = createOfficePptxScopePolicyController()
  cleanups.push(() => controller.dispose())
  await controller.sync(f.a, { active: true })
  expect((await f.get(f.a)).content).toBe('agent override')
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  expect((await f.get(f.b)).content).toBe(f.definition.content)
  await controller.sync(f.a, { active: false })
  expect(await f.get(f.a)).toEqual(source)
})

it('does not leave a policy after an inactive request overtakes a pending active lookup', async () => {
  let entered, release
  const ready = new Promise(resolve => { entered = resolve })
  const wait = new Promise(resolve => { release = resolve })
  const f = await fixture({ load: async definition => { entered(); await wait; return definition } })
  const controller = createOfficePptxScopePolicyController()
  cleanups.push(() => controller.dispose())
  const active = controller.sync(f.a, { active: true })
  await ready
  const inactive = controller.sync(f.a, { active: false })
  release()
  await Promise.all([active, inactive])
  expect(isModelInvocable(await f.get(f.a))).toBe(true)
  await controller.sync(f.a, { active: true })
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
})

it('allows PPT mode with ordinary Office absent and discovers it on a later step', async () => {
  const f = await fixture({ missing: true })
  const controller = createOfficePptxScopePolicyController()
  cleanups.push(() => controller.dispose())
  await controller.sync(f.a, { active: true })
  expect(await f.get(f.a)).toBeUndefined()
  f.root.skills.register(f.definition)
  await controller.sync(f.a, { active: true })
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  await controller.sync(f.a, { active: false })
  expect(isModelInvocable(await f.get(f.a))).toBe(true)
})

it('settles controller disposal even when a source provider never finishes', async () => {
  let entered
  const ready = new Promise(resolve => { entered = resolve })
  const f = await fixture({ load: () => { entered(); return new Promise(() => {}) } })
  const controller = createOfficePptxScopePolicyController()
  const activation = controller.sync(f.a, { active: true })
  await ready
  controller.dispose()
  await activation
  const replacement = f.sa.ctx.get('skills').registerProvider(() => ({
    name: 'dsh-ppt-office-pptx-scope-policy',
    async list() { return [] }, async get() { return undefined },
  }))
  replacement()
})

it('does not leak a parent policy into an existing or newly created child Agent', async () => {
  const f = await fixture()
  const child = await f.runtime.agent('child-policy', f.a)
  const policy = await registerOfficePptxScopePolicy(f.a)
  expect(isModelInvocable(await f.get(f.a))).toBe(false)
  expect(isModelInvocable(await f.get(child))).toBe(true)
  const lateChild = await f.runtime.agent('late-child-policy', f.a)
  expect(isModelInvocable(await f.get(lateChild))).toBe(true)
  const childPolicy = await registerOfficePptxScopePolicy(child)
  expect(isModelInvocable(await f.get(child))).toBe(false)
  childPolicy.dispose()
  expect(isModelInvocable(await f.get(child))).toBe(true)
  policy.dispose()
})

it('reloads the effective project override and resource base after a workspace change', async () => {
  const f = await fixture()
  f.root.skills.registerProvider(() => ({
    name: 'project-override',
    async list({ cwd }) { return [{ ...f.definition, provider: 'project-override', rank: 0, locator: cwd }] },
    async get(candidate) { return { ...f.definition, provider: 'project-override', content: 'Project: ' + candidate.locator, resourceBase: { kind: 'directory', path: candidate.locator } } }
  }))
  const controller = createOfficePptxScopePolicyController()
  cleanups.push(() => controller.dispose())
  await controller.sync(f.a, { active: true, cwd: '/tmp/project-a' })
  expect(await f.root.skills.get('office-pptx', { scope: f.a, cwd: '/tmp/project-a' })).toMatchObject({ content: 'Project: /tmp/project-a', resourceBase: { kind: 'directory', path: '/tmp/project-a' }, invocation: { modelInvocable: false, userInvocable: true } })
  await controller.sync(f.a, { active: true, cwd: '/tmp/project-b' })
  expect(await f.root.skills.get('office-pptx', { scope: f.a, cwd: '/tmp/project-b' })).toMatchObject({ content: 'Project: /tmp/project-b', resourceBase: { kind: 'directory', path: '/tmp/project-b' } })
  await controller.sync(f.a, { active: false })
  expect((await f.root.skills.get('office-pptx', { scope: f.a, cwd: '/tmp/project-b' })).invocation.modelInvocable).toBe(true)
})
