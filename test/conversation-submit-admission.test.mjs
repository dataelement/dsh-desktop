// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as cordis from '@deepseek-ai/cordis'
import * as zod from 'zod'
import { afterEach, expect, it, vi } from 'vitest'

// Evaluate the installed factory, exposing its actual native controllers only to tests.
const source = readFileSync(createRequire(import.meta.url).resolve('@deepseek-ai/dsh-client-ui-conversation/package.json').replace(/package[.]json$/, 'lib/client.js'), 'utf8')
let definition
runInNewContext(source.replace('exports.apply = apply;', 'exports.native = { InputHub, SessionInputShell }; exports.apply = apply;'), {
  window: { __ModuleLoader__: { load: value => { definition = value } } }, document,
  AbortController, Promise, Error, TypeError, setTimeout, clearTimeout, console, navigator, Node, MutationObserver
})
// Observable storage is an external port; the native editor, machine, hub and submit controllers stay real.
const store = {
  createSnapshotStore(initial) {
    let value = initial
    const listeners = new Set()
    return { getSnapshot: () => value, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
      set(next) { value = next; for (const listener of listeners) listener() } }
  },
  defineStore: definition => definition
}
const externals = { react: React, 'react/jsx-runtime': jsx, 'react-dom': ReactDOM, zod,
  '@deepseek-ai/cordis': cordis, '@deepseek-ai/dsh-client-store': store,
  '@deepseek-ai/dsh-client-ui-primitives': {}, '@deepseek-ai/dsh-client-ui-slots': {} }
const { InputHub } = definition.factory(name => {
  if (!(name in externals)) throw new Error('Unexpected client external: ' + name)
  return externals[name]
}).native
const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); localStorage.clear() })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

function fixture(admit = async () => {}) {
  const bindings = new Map(), trace = [], sends = []
  const ctx = new cordis.Context()
  cleanups.push(() => ctx.fiber.dispose())
  ctx.provide('sessions', { binding: id => bindings.get(id), sessionOf: scope => [...bindings.values()].find(value => value.ctx === scope)?.session })
  ctx.provide('conversation', {
    blocks: { storeFor: () => ({ getSnapshot: () => undefined }) },
    sendSession: vi.fn(async (session, text, ids) => { trace.push('send'); sends.push({ sessionId: session.sessionId, text, ids }); return { kind: 'success' } })
  })
  const trigger = { lexicon: { getSnapshot: () => new Map(), subscribe: () => () => {} }, track() {}, dismiss() {},
    serializeReference: async (_source, ref) => '@Space', adjudicate: async () => undefined }
  ctx.provide('inputTriggers', { sessionOf: () => trigger })
  const hub = new InputHub(ctx, key => key)
  function session(id) {
    const scope = ctx.extend()
    scope.on('conversation/input-before-submit', async input => { trace.push('admit:' + input.sessionId); await admit(input) })
    const value = { sessionId: id, projections: { faceOf: () => ({ getSnapshot: () => undefined, subscribe: () => () => {} }) },
      getSnapshot: () => ({ sessionId: id, blank: false, running: false, subagent: null }) }
    const binding = { sessionId: id, ctx: scope, session: value }
    bindings.set(id, binding)
    const shell = hub.shellFor(binding)
    return { shell, binding, scope }
  }
  return { hub, session, sends, trace, bindings }
}

it.each(['question @space', '/unknown @space', ''])('awaits Session admission before sending %j, including attachment-only input', async text => {
  const gate = deferred(), f = fixture(() => gate.promise), { shell } = f.session('one')
  shell.setDraft(text)
  shell.addAttachments(['attachment'])
  shell.submit('next-turn')
  await vi.waitFor(() => expect(f.trace).toEqual(['admit:one']))
  expect(f.sends).toEqual([])
  gate.resolve()
  await vi.waitFor(() => expect(f.sends).toHaveLength(1))
  expect(f.sends[0]).toEqual({ sessionId: 'one', text, ids: ['attachment'] })
})

it('retains the real editor draft and prevents model-facing dispatch when Session permission rejects', async () => {
  const f = fixture(async () => { throw new Error('Permission revoked') }), { shell } = f.session('one')
  shell.setDraft('retain this draft')
  shell.submit('next-turn')
  await vi.waitFor(() => expect(shell.notices.getSnapshot()?.text).toBe('Permission revoked'))
  expect(shell.state.getSnapshot().draft).toBe('retain this draft')
  expect(f.sends).toEqual([])
})

it('does not send a late admission result to a replaced binding or another Session', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), one = f.session('one')
  one.shell.setDraft('first')
  one.shell.submit('next-turn')
  await vi.waitFor(() => expect(f.trace).toEqual(['admit:one']))
  const two = f.session('two')
  two.shell.setDraft('second')
  f.bindings.delete('one')
  gate.resolve()
  await vi.waitFor(() => expect(one.shell.notices.getSnapshot()?.text).toContain('Session binding changed'))
  expect(two.shell.state.getSnapshot().draft).toBe('second')
  expect(f.sends).toEqual([])
})

function claimWithReference(shell, submit) {
  const reference = { source: 'fixture-reference', ref: 'space-7', label: 'Space', clipboardText: '@Space', offset: 0, length: 6 }
  shell.setDraft({ text: '@Space', references: [reference] })
  expect(shell.beginCommand({ name: 'goal', token: '/goal ', submit }, { start: 0, end: 0, draftRev: shell.state.getSnapshot().draftRev })).toBe(true)
  return shell.state.getSnapshot().draft
}

it('checks the frozen claimed-command references before command dispatch without serializing them as a message', async () => {
  const gate = deferred(), payloads = [], f = fixture(async input => { payloads.push(input); await gate.promise })
  const { shell } = f.session('one'), submit = vi.fn(async () => ({ kind: 'success' }))
  claimWithReference(shell, submit)
  shell.submit('next-turn')
  await vi.waitFor(() => expect(payloads).toHaveLength(1))
  expect(payloads[0].command).toEqual({ name: 'goal', args: '@Space' })
  expect(payloads[0].references).toMatchObject([{ source: 'fixture-reference', ref: 'space-7' }])
  expect(Object.isFrozen(payloads[0])).toBe(true)
  expect(Object.isFrozen(payloads[0].references)).toBe(true)
  expect(Object.isFrozen(payloads[0].references[0])).toBe(true)
  expect(submit).not.toHaveBeenCalled()
  gate.resolve()
  await vi.waitFor(() => expect(submit).toHaveBeenCalledExactlyOnceWith('@Space', expect.anything(), []))
  expect(f.sends).toEqual([])
})

it('retains the actual command chip and reference editor document when permission rejects', async () => {
  const f = fixture(async () => { throw new Error('Permission revoked') }), { shell } = f.session('one')
  const submit = vi.fn(), draft = claimWithReference(shell, submit)
  shell.submit('next-turn')
  await vi.waitFor(() => expect(shell.notices.getSnapshot()?.text).toBe('Permission revoked'))
  expect(shell.state.getSnapshot().draft).toBe(draft)
  expect(shell.state.getSnapshot().occurrences).toMatchObject([{ ref: 'space-7' }])
  expect(submit).not.toHaveBeenCalled()
  expect(f.sends).toEqual([])
})

it.each([false, true])('aborts pending admission on disposal before dispatch (command=%s)', async command => {
  const gate = deferred(), inputs = [], f = fixture(async input => { inputs.push(input); await gate.promise }), { shell } = f.session('one')
  const submit = vi.fn(async () => ({ kind: 'success' }))
  if (command) claimWithReference(shell, submit)
  else shell.setDraft('do not send')
  shell.submit('next-turn')
  await vi.waitFor(() => expect(inputs).toHaveLength(1))
  shell.dispose()
  expect(inputs[0].signal.aborted).toBe(true)
  gate.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(submit).not.toHaveBeenCalled()
  expect(f.sends).toEqual([])
})
