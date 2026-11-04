import { describe, expect, it, vi } from 'vitest'
import { createWorkbenchConversation, createInstructionSource, INSTRUCTION_SOURCE } from '../packages/dsh-desktop-workbenches/create-workbench.mjs'

function setup() {
  const state = { draft: '', attachmentIds: [], phase: 'plain' }
  const input = {
    state: { getSnapshot: () => state },
    setDraft: vi.fn(text => { state.draft = text }), focus: vi.fn(), submit: vi.fn(), addAttachments: vi.fn()
  }
  const ctx = {
    conversation: { input: { for: vi.fn(() => input) }, createDrafts: vi.fn() },
    sessions: {
      create: vi.fn(async () => 'fresh-development'),
      using: vi.fn(async (_id, _options, fn) => fn({ ready: Promise.resolve({ ctx: { sessionId: 'fresh-development' } }) }))
    }
  }
  const controller = new AbortController()
  ctx.get = vi.fn(name => name === 'conversation' ? ctx.conversation : undefined)
  const options = {
    ctx, signal: controller.signal, current: () => true, workspaceId: 'project-1',
    request: vi.fn(), activate: vi.fn(),
    prompt: 'Read https://dshdesktop.com/workbench/docs/development.md and ask me about my idea.',
    errorText: key => key
  }
  return { options, ctx, input, state, controller }
}

describe('new workbench conversation', () => {
  it('prepares the exact instructions containing the guide URL without fetching, attaching, or sending', async () => {
    const f = setup()
    expect(await createWorkbenchConversation(f.options)).toBe('fresh-development')
    expect(f.ctx.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project-1' })
    expect(f.options.activate).toHaveBeenCalledWith('fresh-development')
    expect(f.state).toEqual({ draft: f.options.prompt, attachmentIds: [], phase: 'plain' })
    expect(f.options.request).not.toHaveBeenCalled()
    expect(f.ctx.conversation.createDrafts).not.toHaveBeenCalled()
    expect(f.input.addAttachments).not.toHaveBeenCalled()
    expect(f.input.submit).not.toHaveBeenCalled()
    expect(f.input.focus).toHaveBeenCalledOnce()
  })

  it('keeps instructions in one native chip and appends only the editable starter, without attachments or send', async () => {
    const f = setup()
    f.options.starter = 'I want 【purpose】 for 【users】'
    f.options.label = 'Workbench development instructions'
    f.options.compact = true
    f.state.draftRev = 3
    f.input.insertReference = vi.fn(() => true)
    f.ctx.conversation.input.requestDraftInitialization = vi.fn(() => 'applied')
    await createWorkbenchConversation(f.options)
    expect(f.input.insertReference).toHaveBeenCalledWith({ source: INSTRUCTION_SOURCE, ref: f.options.prompt,
      label: f.options.label, clipboardText: f.options.prompt }, { start: 0, end: 0, draftRev: 3 })
    expect(f.ctx.conversation.input.requestDraftInitialization).toHaveBeenCalledWith(expect.anything(), { prompt: f.options.starter, whenDraftExists: 'append' })
    expect(f.input.setDraft).not.toHaveBeenCalled()
    expect(f.input.submit).not.toHaveBeenCalled()
    expect(f.input.addAttachments).not.toHaveBeenCalled()
  })

  it('uses a durable reference codec that previews, copies and serializes the exact original instructions', async () => {
    const open = vi.fn()
    const source = createInstructionSource(open)
    const text = 'Original full instructions\nhttps://dshdesktop.com/workbench/docs/development.md'
    expect(source.name).toBe(INSTRUCTION_SOURCE)
    expect(source.codec.clipboardText(text)).toBe(text)
    expect(await source.codec.serialize(text)).toBe(text)
    expect(source.openReference({}, { ref: text })).toBe(true)
    expect(open).toHaveBeenCalledWith(text)
  })

  it('preserves all instructions and the starter on hosts without compact references', async () => {
    const f = setup()
    f.options.starter = 'My 【idea】'
    f.options.compact = true
    await createWorkbenchConversation(f.options)
    expect(f.state.draft).toBe(f.options.prompt + '\n\n' + f.options.starter)
    expect(f.input.submit).not.toHaveBeenCalled()
  })

  it('does not navigate or send if reference admission fails', async () => {
    const f = setup()
    Object.assign(f.options, { starter: 'My idea', label: 'Instructions', compact: true })
    f.input.insertReference = vi.fn(() => false)
    f.ctx.conversation.input.requestDraftInitialization = vi.fn(() => 'applied')
    await expect(createWorkbenchConversation(f.options)).rejects.toThrow('draftChanged')
    expect(f.options.activate).not.toHaveBeenCalled()
    expect(f.input.submit).not.toHaveBeenCalled()
  })

  it('works without attachment capabilities or a selected workspace', async () => {
    const f = setup()
    delete f.ctx.conversation.createDrafts
    delete f.options.workspaceId
    await createWorkbenchConversation(f.options)
    expect(f.ctx.sessions.create).toHaveBeenCalledWith({})
    expect(f.state.draft).toBe(f.options.prompt)
  })

  it.each([{ draft: 'User draft' }, { attachmentIds: ['user-file'] }, { phase: 'editing' }])('preserves unexpected new-session content: %s', async existing => {
    const f = setup()
    Object.assign(f.state, existing)
    await expect(createWorkbenchConversation(f.options)).rejects.toThrow('draftChanged')
    expect(f.state).toMatchObject(existing)
    expect(f.input.setDraft).not.toHaveBeenCalled()
    expect(f.options.activate).not.toHaveBeenCalled()
  })

  it('does not focus or send after navigation while retaining the new draft', async () => {
    const f = setup()
    f.options.activate.mockImplementation(async () => { f.state.draft += '\nMy idea'; f.controller.abort() })
    await createWorkbenchConversation(f.options)
    expect(f.state.draft).toContain('My idea')
    expect(f.input.submit).not.toHaveBeenCalled()
    expect(f.input.focus).not.toHaveBeenCalled()
  })

  it('does not create a session after cancellation or superseding navigation', async () => {
    for (const abort of [true, false]) {
      const f = setup()
      if (abort) f.controller.abort()
      else f.options.current = () => false
      await createWorkbenchConversation(f.options)
      expect(f.ctx.sessions.create).not.toHaveBeenCalled()
    }
  })

  it('does not modify a session after cancellation during its creation', async () => {
    const f = setup()
    f.ctx.sessions.create.mockImplementation(async () => { f.controller.abort(); return 'fresh-development' })
    await createWorkbenchConversation(f.options)
    expect(f.ctx.sessions.using).not.toHaveBeenCalled()
    expect(f.input.setDraft).not.toHaveBeenCalled()
  })

  it('fails before creating anything on an incompatible runtime', async () => {
    const f = setup()
    delete f.ctx.conversation.input
    await expect(createWorkbenchConversation(f.options)).rejects.toThrow('unsupported')
    expect(f.ctx.sessions.create).not.toHaveBeenCalled()
  })
})
