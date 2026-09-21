import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection'
import { SystemPrompt, renderContextSnapshot } from '@deepseek-ai/dsh-system-prompt'
import * as office from '../packages/dsh-office/index.js'

const cleanup = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'office-modes-'))
  cleanup.push(() => rm(root, { recursive: true, force: true }))
  const ctx = new Context()
  new LocalFileSystem(ctx, { cwd: root, diffBasisMaxBytes: 10 * 1024 * 1024 })
  const handlers = new Map()
  const registered = new Set()
  ctx.provide('connection', { rpc: { handle(channel, handler) {
    if (handlers.has(channel)) throw new Error(`duplicate channel ${channel}`)
    handlers.set(channel, handler)
    return async () => { handlers.delete(channel) }
  } } })
  ctx.provide('tools', { register(tool) { registered.add(tool.name) } })
  ctx.provide('skills', { registerProvider() {} })
  ctx.provide('sandboxPolicy', { resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) })
  for (const plugin of [SessionProjectionRegistry, SessionStore, SystemPrompt]) {
    const fork = ctx.plugin(plugin, plugin === SystemPrompt ? { includeHarnessIdentity: false } : undefined)
    await fork
    cleanup.push(() => fork.dispose())
  }
  const fork = ctx.plugin(office, { root: path.join(root, 'audit') })
  await fork
  cleanup.push(() => fork.dispose())

  const createSession = (id) => ctx.sessions.create(SessionId(id), { meta: { cwd: root } })
  const call = async (endpoint, payload) => {
    const response = await handlers.get('/dsh-office')(endpoint, payload, new AbortController().signal)
    expect(response.ok).toBe(true)
    return response.value
  }
  const callOk = async (endpoint, payload) => {
    const response = await call(endpoint, payload)
    expect(response.status).toBe('ok')
    return response.data
  }
  const context = async session => {
    const agent = { id: session.id, session }
    return renderContextSnapshot(await ctx.systemPrompt.assemble({ scope: agent, agent }))
  }
  return { root, ctx, handlers, registered, fork, createSession, call, callOk, context }
}

it('owns independent Word and Excel state as whole-value session events', async () => {
  const f = await fixture()
  const first = f.createSession('first')
  const second = f.createSession('second')
  expect((await f.callOk('state', { sessionId: first.id })).mode).toBeNull()
  await f.callOk('mode', { sessionId: first.id, mode: 'word' })
  await f.callOk('template/select', { sessionId: first.id, templateId: 'coffee-market' })
  await f.callOk('mode', { sessionId: second.id, mode: 'excel' })

  expect(f.ctx.sessionProjections.stateOf(first, 'office')).toEqual({
    mode: 'word', selectedTemplate: { id: 'coffee-market', mode: 'word', revision: '20260911.7' }
  })
  expect(f.ctx.sessionProjections.stateOf(second, 'office')).toEqual({ mode: 'excel', selectedTemplate: null })
  expect(first.snapshotEvents().filter(event => event.type === 'office/mode').map(event => event.data)).toEqual([
    { mode: 'word', selectedTemplate: null },
    { mode: 'word', selectedTemplate: { id: 'coffee-market', mode: 'word', revision: '20260911.7' } }
  ])

  const restored = f.ctx.sessions.fork(first, undefined, SessionId('restored'))
  expect(f.ctx.sessionProjections.stateOf(restored, 'office')).toEqual(f.ctx.sessionProjections.stateOf(first, 'office'))
  expect((await f.call('state', { sessionId: 'missing' })).status).toBe('error')
})

it('keeps the client RPC response and template preview contracts', async () => {
  const f = await fixture()
  const session = f.createSession('templates')
  await f.callOk('mode', { sessionId: session.id, mode: 'word' })
  const state = await f.callOk('state', { sessionId: session.id })
  expect(state.templates.filter(item => item.mode === 'word')).toHaveLength(3)
  expect(state.templates.filter(item => item.mode === 'excel').map(item => item.pages)).toEqual([20, 5, 4])
  expect(state.templates.every(item => item.thumbnail.startsWith('data:image/webp;base64,') && item.pageAspectRatio > 0)).toBe(true)

  const before = f.ctx.sessionProjections.stateOf(session, 'office')
  const preview = await f.callOk('template/preview', { sessionId: session.id, templateId: 'equity-research', page: 12 })
  expect(preview.image.startsWith('data:image/webp;base64,')).toBe(true)
  expect(f.ctx.sessionProjections.stateOf(session, 'office')).toBe(before)
  expect((await f.call('template/preview', { sessionId: session.id, templateId: 'equity-research', page: 13 })).status).toBe('error')
  expect((await f.call('template/select', { sessionId: session.id, templateId: 'annual-business' })).status).toBe('error')

  const selected = await f.callOk('template/select', { sessionId: session.id, templateId: 'equity-research' })
  expect(selected).toMatchObject({ mode: 'word', selectedTemplateId: 'equity-research', selectedTemplateRevision: '20260911.5' })
  expect((await f.callOk('template/deselect', { sessionId: session.id })).selectedTemplateId).toBeUndefined()
})

it('renders current mode and reviewed template through dynamic system-prompt context', async () => {
  const f = await fixture()
  const session = f.createSession('prompt')
  expect(await f.context(session)).toBe('')

  await f.callOk('mode', { sessionId: session.id, mode: 'word' })
  await f.callOk('template/select', { sessionId: session.id, templateId: 'government-notice' })
  const word = await f.context(session)
  expect(word).toContain('当前会话输出格式：Word (.docx)')
  expect(word).toContain('<skill_content name="dsh-word">')
  expect(word).toContain('office_template(template_id="government-notice")')

  await f.callOk('mode', { sessionId: session.id, mode: 'excel' })
  const excel = await f.context(session)
  expect(excel).toContain('当前会话输出格式：Excel (.xlsx)')
  expect(excel).toContain('<skill_content name="dsh-excel">')
  expect(excel).not.toContain('government-notice')
  expect(session.deriveMessages()).toEqual([])

  await f.callOk('mode', { sessionId: session.id, mode: null })
  expect(await f.context(session)).toBe('')
})

it('binds the RPC disposer to the Office Cordis lifecycle', async () => {
  const f = await fixture()
  expect(f.handlers.has('/dsh-office')).toBe(true)
  await f.fork.dispose()
  expect(f.handlers.has('/dsh-office')).toBe(false)
})
