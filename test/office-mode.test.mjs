import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { agentEvents } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import * as ppt from 'dsh-ppt'
import * as office from '../packages/dsh-office/index.js'

const cleanup = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })
async function fixture(existingRoot) {
  const root = existingRoot ?? await mkdtemp(path.join(os.tmpdir(), 'office-modes-'))
  if (!existingRoot) cleanup.push(() => rm(root, { recursive: true, force: true }))
  const ctx = new Context(), routes = new Map(), registered = new Set()
  ctx.provide('webServer', { register: () => () => {} })
  ctx.provide('connection', { rpc: { handle(route, handler, options) {
    expect(options.authority).toBe('trusted-host'); routes.set(route, handler)
  } } })
  ctx.provide('tools', { register(tool) { registered.add(tool.name) } })
  ctx.provide('sandboxPolicy', { resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) })
  for (const [plugin, config] of [[SystemPrompt, { includeHarnessIdentity: false }], [SkillRegistry, undefined],
    [ppt, { root: path.join(root, 'composer') }], [office, { root: path.join(root, 'office') }]]) {
    const fork = ctx.plugin(plugin, config); await fork; cleanup.push(() => fork.dispose())
  }
  const call = async (channel, endpoint, payload) => {
    const response = await routes.get(channel)(endpoint, payload)
    expect(response.ok).toBe(true); expect(response.value.status).toBe('ok')
    return response.value.data
  }
  async function agent(id = randomUUID()) {
    const agent = { id, session: Session.create(SessionId(id)) }
    const scope = createScope(ctx, agent); agent.ctx = scope.ctx; cleanup.push(() => scope.dispose())
    return agent
  }
  async function preStep(agent) {
    const decision = await agentEvents(ctx, agent).waterfall('agent/pre-step', { turn: 1, step: 1, messages: [], signal: new AbortController().signal }, async () => ({ kind: 'enter', messages: [] }))
    for (const message of decision.messages ?? []) agent.session.append('user/message', message, { surfaceOp: 'append' })
    return decision
  }
  return { root, ctx, registered, call, agent, preStep, routes }
}
const activeSkills = agent => agent.session.deriveMessages().flatMap(message => message.source?.kind === 'plugin' && message.source.form === 'snapshot'
  ? message.source.sections.map(section => section.name).filter(name => ['dsh-word', 'dsh-excel', 'dsh-ppt'].includes(name)) : [])

it('activates both real plugins and atomically persists one document format per session', async () => {
  const f = await fixture(), sessionId = 'same-session'
  expect(f.registered.has('office_build')).toBe(true); expect(f.registered.has('pptd_render')).toBe(true)
  for (const mode of ['word', 'excel']) {
    expect((await f.call('/dsh-office', 'mode', { sessionId, mode })).mode).toBe(mode)
    const state = await f.call('/dsh-ppt', 'state', { sessionId })
    expect(state.documentMode).toBe(mode); expect(state.presentationMode).toBeUndefined()
  }
  await f.call('/dsh-ppt', 'presentation/mode', { sessionId, mode: 'ppt' })
  expect((await f.call('/dsh-office', 'state', { sessionId })).mode).toBe('ppt')
  await f.call('/dsh-office', 'mode', { sessionId, mode: 'word' })
  const restored = await fixture(f.root)
  expect((await restored.call('/dsh-office', 'state', { sessionId })).mode).toBe('word')
  expect((await restored.call('/dsh-office', 'state', { sessionId: 'different' })).mode).toBeNull()
  const directories = await readdir(path.join(f.root, 'composer/sessions'))
  const state = JSON.parse(await readFile(path.join(f.root, 'composer/sessions', directories[0], 'state.json'), 'utf8'))
  expect(state.activities.some(activity => activity.operation === 'select-document-mode')).toBe(true)
})

it('serves the Word and Excel example catalog and bounded previews as read-only operations', async () => {
  const f = await fixture(), sessionId = 'word-preview-session'
  await f.call('/dsh-office', 'mode', { sessionId, mode: 'word' })
  const state = await f.call('/dsh-office', 'state', { sessionId })
  expect(state.templates.filter(item => item.mode === 'word')).toHaveLength(3)
  expect(state.templates.filter(item => item.mode === 'excel').map(item => item.pages)).toEqual([20, 5, 4])
  expect(state.templates.every(item => item.thumbnail.startsWith('data:image/webp;base64,') && item.pageAspectRatio > 0)).toBe(true)
  const before = await f.ctx.officeModes.state(sessionId)
  const preview = await f.call('/dsh-office', 'template/preview', { sessionId, templateId: 'equity-research', page: 12 })
  expect(preview.image.startsWith('data:image/webp;base64,')).toBe(true)
  expect(await f.ctx.officeModes.state(sessionId)).toEqual(before)
  for (const payload of [{ templateId: '../design.md', page: 1 }, { templateId: 'equity-research', page: 13 }, { templateId: 'ai-office', page: 0 }, { templateId: 'ai-office', page: '1' }]) {
    expect((await f.routes.get('/dsh-office')('template/preview', { sessionId, ...payload })).value.status).toBe('error')
  }
  expect((await f.routes.get('/dsh-office')('template/select', { sessionId, templateId: 'campaign-launch' })).value.status).toBe('error')
  expect((await f.call('/dsh-office', 'state', { sessionId })).selectedTemplateId).toBeUndefined()
})

it('retires legacy Word selections and automatic template instructions while preserving the foundation and user text', async () => {
  const f = await fixture(), agent = await f.agent()
  await f.call('/dsh-office', 'mode', { sessionId: agent.id, mode: 'word' })
  const [folder] = await readdir(path.join(f.root, 'composer/sessions'))
  const file = path.join(f.root, 'composer/sessions', folder, 'state.json')
  const persisted = JSON.parse(await readFile(file, 'utf8'))
  await writeFile(file, JSON.stringify({ ...persisted, selectedWordTemplateId: 'campaign-launch' }))
  agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Keep my draft.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Legacy automatic template guide' }], source: {
    kind: 'plugin', plugin: 'dsh-office-composer', form: 'snapshot', sections: [{ name: 'dsh-word', text: 'Legacy Word' }, { name: 'word-template:campaign-launch@20260910.1', text: 'Legacy automatic template guide' }]
  } }), { surfaceOp: 'append' })
  await f.preStep(agent); await f.preStep(agent)
  const snapshots = agent.session.deriveMessages().filter(m => m.source?.plugin === 'dsh-office-composer')
  expect(snapshots).toHaveLength(1)
  expect(snapshots[0].source.sections.map(s => s.name)).toEqual(['dsh-word'])
  expect(await f.ctx.officeModes.state(agent.id)).not.toHaveProperty('selectedWordTemplateId')
  expect(agent.session.deriveMessages().some(m => m.content.some(p => p.text === 'Keep my draft.'))).toBe(true)
  expect(agent.session.deriveMessages().some(m => m.content.some(p => p.text.includes('Legacy automatic template guide')))).toBe(false)
})

it('coordinates template selection, concurrent requests and return to ordinary conversation through the same state owner', async () => {
  const f = await fixture(), sessionId = 'concurrent'
  await Promise.all([
    f.call('/dsh-office', 'mode', { sessionId, mode: 'word' }),
    f.call('/dsh-ppt', 'presentation/mode', { sessionId, mode: 'ppt' }),
    f.call('/dsh-office', 'mode', { sessionId, mode: 'excel' })
  ])
  const state = await f.call('/dsh-ppt', 'state', { sessionId })
  expect([state.documentMode, state.presentationMode].filter(Boolean)).toHaveLength(1)
  await f.call('/dsh-ppt', 'template/select', { sessionId, mode: 'ppt', templateId: state.templates[0].id })
  expect((await f.call('/dsh-office', 'state', { sessionId })).mode).toBe('ppt')
  await f.call('/dsh-office', 'mode', { sessionId, mode: null })
  const cleared = await f.call('/dsh-ppt', 'state', { sessionId })
  expect(cleared.presentationMode).toBeUndefined(); expect(cleared.documentMode).toBeUndefined()
  expect(cleared.selectedTemplateId).toBe(state.templates[0].id)
})

it('loads the selected Word/Excel skill and retires automatic instructions when changing formats', async () => {
  const f = await fixture(), agent = await f.agent()
  agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'User source remains available.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  for (const mode of ['word', 'excel']) {
    await f.call('/dsh-office', 'mode', { sessionId: agent.id, mode })
    await f.preStep(agent)
    expect(activeSkills(agent)).toEqual([`dsh-${mode}`])
    await f.preStep(agent)
    expect(activeSkills(agent)).toEqual([`dsh-${mode}`])
  }
  await f.call('/dsh-ppt', 'presentation/mode', { sessionId: agent.id, mode: 'ppt' })
  await f.preStep(agent)
  expect(activeSkills(agent)).toEqual(['dsh-ppt'])
  await f.call('/dsh-office', 'mode', { sessionId: agent.id, mode: null })
  await f.preStep(agent)
  expect(activeSkills(agent)).toEqual([])
  expect(agent.session.deriveMessages().some(message => message.content.some(part => part.text === 'User source remains available.'))).toBe(true)
})

it('refreshes a same-mode foundation snapshot after an application Skill update', async () => {
  const f = await fixture(), agent = await f.agent()
  await f.call('/dsh-office', 'mode', { sessionId: agent.id, mode: 'word' })
  agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Previous foundation instructions' }], source: {
    kind: 'plugin', plugin: 'dsh-office-composer', form: 'snapshot', sections: [{ name: 'dsh-word', text: 'Previous foundation instructions' }]
  } }), { surfaceOp: 'append' })
  await f.preStep(agent); await f.preStep(agent)
  const snapshots = agent.session.deriveMessages().filter(message => message.source?.plugin === 'dsh-office-composer')
  expect(snapshots).toHaveLength(1)
  expect(snapshots[0].source.sections[0].text).toContain('office_skill_read')
  expect(snapshots[0].source.sections[0].text).not.toContain('Previous foundation instructions')
})

it('migrates prior product-named foundation context and preserves explicit user messages', async () => {
  const f = await fixture(), agent = await f.agent()
  await f.call('/dsh-office', 'mode', { sessionId:agent.id, mode:'excel' })
  agent.session.append('user/message', createUserMessage({ content:[{ type:'text', text:'My original request' }], source:{ kind:'user' } }), { surfaceOp:'append' })
  agent.session.append('user/message', createUserMessage({ content:[{ type:'text', text:'Old automatic foundation' }], source:{ kind:'plugin', plugin:'workbuddy-office-composer', form:'snapshot', sections:[{ name:'workbuddy-excel', text:'Old automatic foundation' }] } }), { surfaceOp:'append' })
  await f.preStep(agent); await f.preStep(agent)
  expect(activeSkills(agent)).toEqual(['dsh-excel'])
  expect(agent.session.deriveMessages().filter(m=>m.source?.plugin==='workbuddy-office-composer')).toEqual([])
  expect(agent.session.deriveMessages().some(m=>m.content.some(p=>p.text==='My original request'))).toBe(true)
})
