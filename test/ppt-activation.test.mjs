import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { agentEvents, assembleContextFor } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { createScope } from '@deepseek-ai/dsh-scope'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { SkillRegistry, isModelInvocable, isUserInvocable } from '@deepseek-ai/dsh-skill'
import { PERSONA_PREFIX_SECTION, SystemPrompt, renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { apply } from 'dsh-ppt'

const cleanups = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

// Exercise the installed, patched plugin, its actual disk-backed RPC state,
// and Harness prompt/skill/session services; no model or network is needed.
async function fixture(existingRoot) {
  const root = existingRoot ?? await mkdtemp(path.join(os.tmpdir(), 'dsh-ppt-activation-'))
  if (!existingRoot) cleanups.push(() => rm(root, { recursive: true, force: true }))
  const ctx = new Context()
  const prompt = ctx.plugin(SystemPrompt, { includeHarnessIdentity: false, personaPrefix: 'Default persona.' })
  await prompt
  cleanups.push(() => prompt.dispose())
  const skills = ctx.plugin(SkillRegistry)
  await skills
  cleanups.push(() => skills.dispose())
  let rpc
  const tools = []
  const plugin = ctx.plugin({
    inject: ['systemPrompt', 'skills'],
    async apply(pluginCtx) {
      const host = {
        // The plugin scopes its webServer work under ctx.inject(['webServer'])
        // (0.1.5 owns connection routes on the reading Context). This fixture
        // has no webServer service, so run those callbacks on the same fake
        // host — with the two members they touch — and delegate the rest.
        effect: (run) => { run?.(); return () => {} },
        webServer: { register: () => () => {} },
        inject: (services, callback) =>
          services?.includes?.('webServer')
            ? callback?.(host)
            : pluginCtx.inject(services, callback),
        systemPrompt: pluginCtx.systemPrompt,
        skills: pluginCtx.skills,
        on: pluginCtx.on.bind(pluginCtx),
        get: pluginCtx.get.bind(pluginCtx),
        tools: { register: (tool) => tools.push(tool) },
        connection: { rpc: { handle: (_route, handler) => { rpc = handler } } }
      }
      await apply(host, { root })
    }
  })
  await plugin
  cleanups.push(() => plugin.dispose())

  async function agent({ id = randomUUID(), seed, complete = false } = {}) {
    const instance = { id, session: Session.create(SessionId(id), seed) }
    const scope = createScope(ctx, instance)
    instance.ctx = scope.ctx
    cleanups.push(() => scope.dispose())
    await scope.ctx.plugin({
      inject: ['systemPrompt'],
      apply(c) {
        c.systemPrompt.section({ name: PERSONA_PREFIX_SECTION, order: 0, text: 'My custom preset.', complete })
      }
    })
    return instance
  }

  async function toggle(agent, active) {
    const result = await rpc('presentation/mode', { sessionId: agent.id, mode: active ? 'ppt' : null })
    expect(result.ok).toBe(true)
    expect(result.value.status).toBe('ok')
  }

  const assemble = (agent) => ctx.systemPrompt.assemble(agent ? assembleContextFor(agent) : {})
  async function preStep(agent, { step = 1, reject = false, aborted = false } = {}) {
    const controller = new AbortController()
    if (aborted) controller.abort()
    const decision = await agentEvents(ctx, agent).waterfall('agent/pre-step', {
      turn: 1, step, messages: [], signal: controller.signal
    }, async () => reject ? { kind: 'reject' } : { kind: 'enter', messages: [] })
    if (decision.kind === 'enter') {
      for (const message of decision.messages) agent.session.append('user/message', message, { surfaceOp: 'append' })
    }
    return decision
  }
  return { root, ctx, tools, agent, toggle, assemble, preStep, rpc: (...args) => rpc(...args) }
}

function automaticMessages(agent) {
  return agent.session.deriveMessages().filter(m => m.source.kind === 'plugin'
    && ['dsh-ppt-skill', 'dsh-ppt-composer'].includes(m.source.plugin))
}

describe('PPT instructions follow the session composer button', () => {
  it('keeps the plugin/tools installed without changing an inactive custom preset or global assembly', async () => {
    const f = await fixture()
    const agent = await f.agent()
    expect(f.tools.some(tool => tool.name === 'pptd_render')).toBe(true)
    expect(renderPrompt(await f.assemble(agent))).toBe('My custom preset.')
    expect(renderPrompt(await f.assemble())).toBe('Default persona.')
    await f.preStep(agent)
    expect(agent.session.deriveMessages()).toEqual([])
  })

  it('isolates enabled and disabled sessions even when assemblies run concurrently', async () => {
    const f = await fixture()
    const enabled = await f.agent()
    const disabled = await f.agent()
    await f.toggle(enabled, true)
    const results = await Promise.all(Array.from({ length: 10 }, async (_, index) => {
      const active = index % 2 === 0
      const assembly = await f.assemble(active ? enabled : disabled)
      return { active, hasPpt: assembly.sections.some(s => s.name === 'tool:dsh-ppt') }
    }))
    for (const result of results) expect(result.hasPpt).toBe(result.active)
    await f.preStep(enabled)
    await f.preStep(disabled)
    expect(automaticMessages(enabled)).toHaveLength(2)
    expect(automaticMessages(disabled)).toEqual([])
  })

  it('retires only automatic instructions when turned off, and reloads them on reactivation', async () => {
    const f = await fixture()
    const agent = await f.agent()
    const user = createUserMessage({ content: [{ type: 'text', text: 'Keep my presentation notes.' }], source: { kind: 'user' } })
    agent.session.append('user/message', user, { surfaceOp: 'append' })
    await f.toggle(agent, true)
    await f.preStep(agent)
    const original = agent.session.snapshotEvents()
    expect(automaticMessages(agent)).toHaveLength(2)
    await f.toggle(agent, false)
    expect(renderPrompt(await f.assemble(agent))).toBe('My custom preset.')
    await f.preStep(agent, { step: 2 })
    expect(automaticMessages(agent)).toEqual([])
    expect(agent.session.deriveMessages().find(m => m.id === user.id)).toEqual(user)
    // Replacements change only the model surface; the original audit log survives.
    expect(agent.session.snapshotEvents().slice(0, original.length)).toEqual(original)
    const count = agent.session.seq
    await f.preStep(agent)
    expect(agent.session.seq).toBe(count)
    await f.toggle(agent, true)
    await f.preStep(agent)
    expect(automaticMessages(agent).filter(m => m.source.plugin === 'dsh-ppt-skill')).toHaveLength(1)
    expect(renderPrompt(await f.assemble(agent))).toContain('Use the bounded pptd_* tools')
  })

  it('respects persisted mode after restart and clears retained automatic snapshots on a resumed inactive session', async () => {
    const f = await fixture()
    const agent = await f.agent()
    await f.toggle(agent, true)
    await f.preStep(agent)
    const restored = await fixture(f.root)
    const resumed = await restored.agent({ id: agent.id, seed: agent.session.snapshotEvents() })
    expect(renderPrompt(await restored.assemble(resumed))).toContain('Use the bounded pptd_* tools')
    await restored.toggle(resumed, false)
    await restored.preStep(resumed)
    expect(automaticMessages(resumed)).toEqual([])
    expect(renderPrompt(await restored.assemble(resumed))).toBe('My custom preset.')
  })

  it('preserves complete custom system prompts even with PPT selected', async () => {
    const f = await fixture()
    const agent = await f.agent({ complete: true })
    await f.toggle(agent, true)
    expect(renderPrompt(await f.assemble(agent))).toBe('My custom preset.')
  })

  it('keeps the bundled Skill host-managed, excluding generic model and slash-command invocation', async () => {
    const f = await fixture()
    const agent = await f.agent()
    const skill = await f.ctx.skills.get('dsh-ppt', { scope: agent })
    expect(skill).toBeDefined()
    expect(isModelInvocable(skill)).toBe(false)
    expect(isUserInvocable(skill)).toBe(false)
    await f.toggle(agent, true)
    await f.preStep(agent)
    expect(automaticMessages(agent).some(m => m.source.plugin === 'dsh-ppt-skill')).toBe(true)
  })

  it('does not mutate history for a rejected or cancelled step', async () => {
    const f = await fixture()
    const agent = await f.agent()
    await f.toggle(agent, true)
    await f.preStep(agent)
    await f.toggle(agent, false)
    const original = agent.session.snapshotEvents()
    await f.preStep(agent, { reject: true })
    await f.preStep(agent, { aborted: true })
    expect(agent.session.snapshotEvents()).toEqual(original)
  })
})


describe('PPT catalog migration', () => {
  it.each(['DSH-PPT-AUTHORING-20260906-V2', 'DSH-PPT-AUTHORING-20260907-V3'])('refreshes %s with the current validation workflow', async (marker) => {
    const f = await fixture()
    const agent = await f.agent()
    await f.toggle(agent, true)
    agent.session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: `${marker} old workflow` }],
      source: { kind: 'plugin', plugin: 'dsh-ppt-skill', form: 'snapshot', sections: [{ name: 'dsh-ppt', text: `${marker} old workflow` }] }
    }), { surfaceOp: 'append' })
    await f.preStep(agent)
    const messages = automaticMessages(agent).filter(m => m.source.plugin === 'dsh-ppt-skill')
    expect(messages).toHaveLength(1)
    expect(JSON.stringify(messages)).toContain('pptd_check')
    expect(JSON.stringify(messages)).toContain('literalEscapes')
    expect(JSON.stringify(messages)).toContain('text-escaped-newline')
    expect(JSON.stringify(messages)).not.toContain('old workflow')
  })

  it('refreshes an old automatic Skill snapshot when PPT remains active', async () => {
    const f = await fixture()
    const agent = await f.agent()
    await f.toggle(agent, true)
    agent.session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Withdrawn template instructions' }],
      source: { kind: 'plugin', plugin: 'kimi-ppt-skill', form: 'snapshot', sections: [{ name: 'kimi-ppt', text: 'Withdrawn template instructions' }] }
    }), { surfaceOp: 'append' })
    await f.preStep(agent)
    const messages = automaticMessages(agent).filter(m => m.source.plugin === 'dsh-ppt-skill')
    expect(messages).toHaveLength(1)
    expect(JSON.stringify(messages)).toContain('DSH-PPT-AUTHORING-20260910-V4')
    expect(JSON.stringify(messages)).not.toContain('Withdrawn template instructions')
  })

  it('replaces a retired selection through the real RPC while preserving historical decks and output files', async () => {
    const f = await fixture()
    const sessionId = randomUUID()
    const dir = path.join(f.root, 'sessions', createHash('sha256').update(sessionId).digest('hex').slice(0, 32))
    await mkdir(dir, { recursive: true })
    const historicalDeck = { id: 'old-deck', template: { id: 'kimi-business-curated-vitality-blue' }, output: { storageKey: 'outputs/user.pptx' } }
    await writeFile(path.join(dir, 'state.json'), JSON.stringify({ sessionId, presentationMode: 'ppt', selectedTemplateId: 'kimi-business-curated-vitality-blue', templates: [{ id: 'untrusted-old-template' }], decks: [historicalDeck], activities: [] }))
    await mkdir(path.join(dir, 'outputs'))
    await writeFile(path.join(dir, 'outputs/user.pptx'), 'unchanged user output')
    const state = (await f.rpc('state', { sessionId })).value.data
    expect(state.templates).toHaveLength(16)
    expect(state.templates.map(t => t.id)).not.toContain('kimi-business-curated-vitality-blue')
    expect(state.selectedTemplateId).toBe('dsh-engineering-blueprint')
    expect(state.templateMigration.reason).toBe('template-retired')
    expect(state.decks).toEqual([historicalDeck])
    const selection = await f.rpc('template/select', { sessionId, templateId: 'dsh-course-workshop', mode: 'ppt' })
    expect(selection.value.status).toBe('ok')
    const persisted = (await f.rpc('state', { sessionId })).value.data
    expect(persisted.selectedTemplateId).toBe('dsh-course-workshop')
    expect(persisted.templateMigration).toBeUndefined()
    expect(persisted.decks).toEqual([historicalDeck])
    expect(await readFile(path.join(dir, 'outputs/user.pptx'), 'utf8')).toBe('unchanged user output')
    expect((await f.rpc('template/select', { sessionId, templateId: 'kimi-business-curated-vitality-blue', mode: 'ppt' })).value.status).toBe('error')
  })
})

describe('PPT identity compatibility', () => {
  it('keeps a retained legacy template selected without reporting it as retired', async () => {
    const f = await fixture()
    const sessionId = randomUUID()
    const dir = path.join(f.root, 'sessions', createHash('sha256').update(sessionId).digest('hex').slice(0, 32))
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'state.json'), JSON.stringify({ sessionId, presentationMode: 'ppt', selectedTemplateId: 'kimi-work-curated-modular-logistics-system' }))
    const state = (await f.rpc('state', { sessionId })).value.data
    expect(state.selectedTemplateId).toBe('dsh-work-curated-modular-logistics-system')
    expect(state.presentationMode).toBe('ppt')
    expect(state.templateMigration).toBeUndefined()
    expect(state.templates).toHaveLength(16)
  })

  it('clears legacy automatic prompts while preserving user-authored references when PPT is off', async () => {
    const f = await fixture()
    const agent = await f.agent()
    agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Please compare Kimi and other tools.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
    agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Old automatic instructions' }], source: { kind: 'plugin', plugin: 'kimi-ppt-composer', form: 'snapshot', sections: [{ name: 'kimi-ppt-composer', text: 'Old automatic instructions' }] } }), { surfaceOp: 'append' })
    await f.preStep(agent)
    const surface = JSON.stringify(agent.session.deriveMessages())
    expect(surface).not.toContain('Old automatic instructions')
    expect(surface).toContain('Please compare Kimi and other tools.')
    expect(automaticMessages(agent)).toHaveLength(0)
  })
})
