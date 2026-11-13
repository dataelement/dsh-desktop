import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import vm from 'node:vm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
// The host provides these primitives. Exercise the install flow through their
// public props; their native layout and focus handling are checked in Electron.
const Button = ({ children, icon, variant, ...props }) => React.createElement('button', { ...props, 'data-button-variant': variant }, icon, children)
const IconDownloadOutlineRegular = () => React.createElement('svg', { 'data-download-icon': true })
const Modal = ({ open, onClose, title, closeLabel, description, children, footer, className }) => open && createPortal(
  React.createElement('section', { role: 'dialog', 'aria-modal': true, 'aria-label': title, className },
    React.createElement('h2', null, title), React.createElement('button', { 'aria-label': closeLabel, onClick: onClose }, '×'),
    React.createElement('p', null, description), children, footer), document.body)
import { JSDOM } from 'jsdom'
import { afterEach, expect, it, vi } from 'vitest'
import { parseInstallSpec, PluginManager } from '@deepseek-ai/dsh-plugin-manager'

const source = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
let root, dom
const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  dom?.window.close()
  globalThis.window = previous.window
  globalThis.document = previous.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
})
async function mount(language = 'zh') {
  dom = new JSDOM('<body><div id="root"></div></body>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let plugin
  const dictionaries = new Map()
  const manager = {
    installBundle: vi.fn(async () => ({ ok: true, value: { application: 'applied', bundle: 'shared-workbench', version: '1.0.0' } })),
    setBundleEnabled: vi.fn(async () => ({ ok: true, value: { application: 'applied' } })),
    waitForInstall: vi.fn(), cancelInstall: vi.fn(async () => ({ ok: true, value: { status: 'cancelled' } }))
  }
  const ctx = {
    locale: { register: (ns, copy) => dictionaries.set(ns, copy), bind: ns => key => dictionaries.get(ns)?.[language]?.[key] || key },
    effect: (fn, label) => { if (label === 'workbenches: install dictionaries') fn() },
    get: vi.fn(() => undefined), slots: { inject() {} }, layout: { selectPanel: vi.fn() }, remote: { pluginManager: manager },
    workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'workspace-1' }] }) }, initializeDefault: vi.fn(async () => ({ workspaceId: 'default-workspace' })) },
    uiWorkspace: { startSession: vi.fn() }
  }
  const pathFor = vi.fn(file => `/tmp/${file.name}`)
  vm.runInNewContext(source.replace('return { apply, inject:', 'return { WorkbenchInstallMenu, apply, inject:'), {
    window: { localStorage: { getItem: () => null }, __ModuleLoader__: { load({ factory }) {
      plugin = factory(name => name === 'react' ? React : name === 'react-dom' ? { createPortal } : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol() } } : { Button, Modal, IconDownloadOutlineRegular, Menu: ({ anchor, open, items, onSelect }) => React.createElement(React.Fragment, null, anchor, open && React.createElement('div', { role: 'menu' }, ...items.map(item => React.createElement('button', { key: item.id, role: 'menuitem', onClick: () => onSelect(item.id) }, item.label)))) })
    } } }, document: dom.window.document, setTimeout, clearTimeout, AbortController,
    __DSH_HOST_PATHS__: { pathFor }, crypto: { randomUUID }
  })
  plugin.apply(ctx)
  let snapshot
  const listeners = new Set()
  const service = Object.assign(Object.create(plugin.Workbenches.prototype), {
    ctx, state: { active: null }, native: { status: 'ready', bundles: {} }, hostRestartNeeded: false, extraRestartSources: new Set(), applicationOutcomes: new Map(),
    localInstall: { phase: 'idle', file: null, requestId: null, pendingBuilds: [], error: '' },
    load: vi.fn(async () => {}), refreshNative: vi.fn(async () => {}), setMarketOpen: vi.fn(),
    leave: vi.fn(async () => { service.state.active = null }),
    publish: () => { snapshot = { localInstall: service.localInstall, ready: true, restartNeeded: service.restartNeeded }; for (const listener of listeners) listener() },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) }, getSnapshot: () => snapshot
  })
  service.publish()
  const onInstalled = vi.fn()
  root = createRoot(dom.window.document.getElementById('root'))
  await act(async () => root.render(React.createElement(plugin.WorkbenchInstallMenu, { service, onInstalled })))
  const button = text => [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === text)
  const openMenu = async () => { await act(async () => dom.window.document.querySelector('[aria-haspopup=menu]').click()) }
  const openUpload = async () => { await openMenu(); await act(async () => { button(language === 'zh' ? '上传安装包安装' : 'Install from a package').click(); await new Promise(resolve => setTimeout(resolve, 0)) }) }
  return { ctx, service, manager, onInstalled, pathFor, openMenu, openUpload, text: () => dom.window.document.body.textContent,
    button: text => [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === text) }
}
async function selectFile(name = 'shared.tgz') {
  const input = dom.window.document.querySelector('input[type=file]')
  Object.defineProperty(input, 'files', { configurable: true, value: name ? [new dom.window.File(['package'], name)] : [] })
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
}
it('offers both installation methods in the header dropdown without a guide page', async () => {
  const ui = await mount()
  expect(dom.window.document.querySelector('[role=dialog]')).toBeNull()
  expect(ui.button('通过会话安装')).toBeUndefined()
  expect(dom.window.document.querySelector('[aria-haspopup=menu]').getAttribute('data-button-variant')).toBe('outline')
  expect(dom.window.document.querySelector('[aria-haspopup=menu] [data-download-icon]')).not.toBeNull()
  await ui.openMenu()
  expect(ui.button('通过会话安装')).toBeDefined()
  expect(ui.button('上传安装包安装')).toBeDefined()
  expect(ui.text()).not.toContain('工作台安装步骤')
  expect(ui.text()).not.toContain('复制安装指令')
  expect(ui.ctx.layout.selectPanel).not.toHaveBeenCalled()
})
it('opens a conversation with an unsent draft and leaves active workbench mode', async () => {
  const ui = await mount('en')
  await ui.openMenu()
  ui.service.state.active = 'existing-workbench'
  await act(async () => ui.button('Install in a conversation').click())
  expect(ui.service.leave).toHaveBeenCalledOnce()
  expect(ui.ctx.uiWorkspace.startSession).toHaveBeenCalledWith('workspace-1', expect.objectContaining({ whenDraftExists: 'append', prompt: expect.stringContaining('I want to install a workbench.') }))
  const { prompt } = ui.ctx.uiWorkspace.startSession.mock.calls[0][1]
  expect(prompt).toContain('Ask one necessary question at a time and wait for my answer')
  expect(prompt).toContain('try one main operation')
  expect(prompt).not.toContain('colleague')
  expect(ui.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
  expect(ui.ctx.layout.selectPanel.mock.invocationCallOrder[0]).toBeLessThan(ui.ctx.uiWorkspace.startSession.mock.invocationCallOrder[0])
  expect(ui.manager.installBundle).not.toHaveBeenCalled()
})
it('prepares a default workspace so first use also carries the installation draft', async () => {
  const ui = await mount()
  ui.ctx.workspaces.list.getSnapshot = () => ({ items: [] })
  await ui.openMenu()
  await act(async () => ui.button('通过会话安装').click())
  expect(ui.ctx.workspaces.initializeDefault).toHaveBeenCalledOnce()
  expect(ui.ctx.uiWorkspace.startSession).toHaveBeenCalledWith('default-workspace', expect.objectContaining({ whenDraftExists: 'append', prompt: expect.stringContaining('我想安装一个工作台') }))
  const { prompt } = ui.ctx.uiWorkspace.startSession.mock.calls[0][1]
  expect(prompt).toContain('每次只问一个影响下一步的必要问题，并等待我回答')
  expect(prompt).toContain('实际打开界面并试一次主要操作')
  expect(prompt).not.toContain('同事')
  expect(ui.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
})
it('keeps the guide open when no installation workspace can be prepared', async () => {
  const ui = await mount()
  ui.ctx.workspaces.list.getSnapshot = () => ({ items: [] })
  ui.ctx.workspaces.initializeDefault.mockResolvedValue(undefined)
  await expect(ui.service.startInstallConversation()).rejects.toThrow('无法准备安装会话')
  expect(ui.ctx.uiWorkspace.startSession).not.toHaveBeenCalled()
  expect(ui.service.setMarketOpen).not.toHaveBeenCalled()
})
it('installs with enablement and automatically returns to the installed list', async () => {
  const ui = await mount()
  await ui.openUpload()
  expect(dom.window.document.querySelector('[role=dialog]')).not.toBeNull()
  expect(ui.button('确认安装').disabled).toBe(true)
  expect(ui.button('确认安装').getAttribute('data-button-variant')).toBe('primary')
  expect(dom.window.document.querySelector('[role=dialog]').className).toBe('dshWbInstallModal')
  await selectFile()
  expect(ui.text()).toContain('shared.tgz')
  expect(ui.manager.installBundle).not.toHaveBeenCalled()
  await act(async () => ui.button('确认安装').click())
  expect(ui.manager.installBundle).toHaveBeenCalledWith('/tmp/shared.tgz', expect.objectContaining({ enabled: true, requestId: expect.any(String) }))
  expect(ui.service.localInstall.bundle).toBe('shared-workbench')
  expect(ui.manager.setBundleEnabled).not.toHaveBeenCalled()
  expect(ui.service.refreshNative).toHaveBeenCalledOnce()
  expect(ui.onInstalled).toHaveBeenCalledOnce()
  expect(dom.window.document.querySelector('[role=dialog]')).toBeNull()
})
it('rejects unsupported files and preserves a selection when the picker is cancelled', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  await selectFile('workbench.zip')
  expect(ui.text()).toContain('Choose a .tgz or .tar.gz')
  expect(ui.pathFor).not.toHaveBeenCalled()
  await selectFile('workbench.tar.gz')
  await selectFile(null)
  expect(ui.text()).toContain('workbench.tar.gz')
  expect(ui.manager.installBundle).not.toHaveBeenCalled()
})
it('prevents duplicate installs and lets the user cancel an active task', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  let finish
  ui.manager.installBundle.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  await selectFile()
  await act(async () => { ui.button('Confirm installation').click(); ui.button('Confirm installation')?.click() })
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  expect(ui.button('Close').disabled).toBe(true)
  expect(dom.window.document.querySelector('[aria-haspopup=menu]').disabled).toBe(true)
  await act(async () => ui.button('Cancel installation').click())
  expect(ui.manager.cancelInstall).toHaveBeenCalledWith(ui.service.localInstall.requestId)
  await act(async () => finish({ ok: true, value: { application: 'cancelled' } }))
  expect(ui.text()).toContain('Installation cancelled')
  expect(ui.button('Confirm installation')).toBeDefined()
})
it.each(['unknown', 'querying'])('cancels the original active manager task after disconnect in %s', async phase => {
  const ui = await mount('en')
  const manager = Object.assign(Object.create(PluginManager.prototype), { installs: new Map(), ownerContext: { emit: vi.fn() } })
  let finish
  const outcome = new Promise(resolve => { finish = resolve })
  const abort = new AbortController()
  abort.signal.addEventListener('abort', () => finish({ application: 'cancelled' }))
  ui.manager.installBundle.mockImplementation(async (_, { requestId }) => {
    manager.installs.set(requestId, { phase: 'installing', abort, result: outcome })
    throw new Error('Connection lost')
  })
  ui.manager.waitForInstall.mockImplementation(async id => ({ ok: true, value: await manager.waitForInstall(id) }))
  ui.manager.cancelInstall.mockImplementation(async id => ({ ok: true, value: await manager.cancelInstall(id) }))
  await ui.openUpload()
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  const requestId = ui.service.localInstall.requestId
  if (phase === 'querying') await act(async () => ui.button('Query installation result').click())
  expect(ui.service.localInstall.phase).toBe(phase)
  expect(ui.button('Cancel installation').disabled).toBe(false)
  await selectFile('another.tgz')
  expect(ui.service.localInstall.file.name).toBe('shared.tgz')
  if (phase === 'querying') {
    expect(ui.button('Close').disabled).toBe(true)
    await act(async () => dom.window.document.querySelector('[role=dialog] button[aria-label=Close]').click())
    expect(dom.window.document.querySelector('[role=dialog]')).not.toBeNull()
  }
  await act(async () => ui.button('Cancel installation').click())
  expect(ui.manager.cancelInstall).toHaveBeenCalledWith(requestId)
  expect(abort.signal.aborted).toBe(true)
  expect(ui.service.localInstall).toMatchObject({ phase: 'cancelled', requestId, cancelling: false })
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
})
it.each(['too-late', 'not-running'])('recovers the actual result rather than assuming %s means cancelled', async status => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  const requestId = ui.service.localInstall.requestId
  ui.manager.cancelInstall.mockResolvedValueOnce({ ok: true, value: { status } })
  ui.manager.waitForInstall.mockResolvedValueOnce({ ok: true, value: status === 'too-late' ? { application: 'applied', bundle: 'shared-workbench' } : null })
  await act(async () => ui.button('Cancel installation').click())
  expect(ui.manager.waitForInstall).toHaveBeenCalledWith(requestId)
  expect(ui.service.localInstall.phase).toBe(status === 'too-late' ? 'installed' : 'unknown')
  expect(ui.service.localInstall.cancelling).toBe(false)
})
it.each(['reply', 'error'])('ignores a stale query %s after cancellation and a new installation', async kind => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  let resolve, reject
  ui.manager.waitForInstall.mockImplementationOnce(() => new Promise((yes, no) => { resolve = yes; reject = no }))
  await act(async () => ui.button('Query installation result').click())
  await act(async () => ui.button('Cancel installation').click())
  await selectFile('another.tgz')
  ui.manager.installBundle.mockImplementationOnce(() => new Promise(() => {}))
  await act(async () => ui.button('Confirm installation').click())
  const current = ui.service.localInstall
  await act(async () => kind === 'reply' ? resolve({ ok: true, value: { application: 'applied', bundle: 'old-workbench' } }) : reject(new Error('Old query disconnected')))
  expect(ui.service.localInstall).toEqual(current)
  expect(ui.service.refreshNative).not.toHaveBeenCalled()
  expect(ui.onInstalled).not.toHaveBeenCalled()
})
it('ignores a late install reply after cancellation and a new task starts', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  let installReply
  ui.manager.installBundle.mockImplementationOnce(() => new Promise(resolve => { installReply = resolve }))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  await act(async () => ui.button('Cancel installation').click())
  await selectFile('another.tgz')
  ui.manager.installBundle.mockImplementationOnce(() => new Promise(() => {}))
  await act(async () => ui.button('Confirm installation').click())
  const current = ui.service.localInstall
  await act(async () => {
    installReply({ ok: true, value: { application: 'applied', bundle: 'old-workbench' } })
  })
  expect(ui.service.localInstall).toEqual(current)
  expect(ui.service.refreshNative).not.toHaveBeenCalled()
})
it.each(['reply', 'error'])('ignores a late cancel %s after the query settles and a new task starts', async kind => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  let queryReply, cancelReply, cancelError
  ui.manager.waitForInstall.mockImplementationOnce(() => new Promise(resolve => { queryReply = resolve }))
  ui.manager.cancelInstall.mockImplementationOnce(() => new Promise((resolve, reject) => { cancelReply = resolve; cancelError = reject }))
  await act(async () => ui.button('Query installation result').click())
  await act(async () => ui.button('Cancel installation').click())
  expect(ui.button('Close').disabled).toBe(true)
  await act(async () => queryReply({ ok: true, value: { application: 'cancelled' } }))
  await selectFile('another.tgz')
  ui.manager.installBundle.mockImplementationOnce(() => new Promise(() => {}))
  await act(async () => ui.button('Confirm installation').click())
  const current = ui.service.localInstall
  await act(async () => kind === 'reply' ? cancelReply({ ok: true, value: { status: 'cancelled' } }) : cancelError(new Error('Old cancel disconnected')))
  expect(ui.service.localInstall).toEqual(current)
  expect(ui.manager.waitForInstall).toHaveBeenCalledOnce()
})
it('keeps close and replacement locked while cancelling an unknown task', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  let finish
  ui.manager.cancelInstall.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await act(async () => ui.button('Cancel installation').click())
  expect(ui.button('Close').disabled).toBe(true)
  expect(ui.button('Cancel installation').disabled).toBe(true)
  expect(ui.button('Query installation result').disabled).toBe(true)
  await act(async () => dom.window.document.querySelector('[role=dialog] button[aria-label=Close]').click())
  expect(dom.window.document.querySelector('[role=dialog]')).not.toBeNull()
  await selectFile('another.tgz')
  await act(async () => ui.service.installWorkbenchPackage())
  expect(ui.service.localInstall.file.name).toBe('shared.tgz')
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  await act(async () => finish({ ok: true, value: { status: 'cancelled' } }))
})
it('queries an uncertain result without installing the package a second time', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockResolvedValue({ ok: false, error: { message: 'Connection lost' } })
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  expect(ui.button('Confirm installation')).toBeUndefined()
  ui.manager.waitForInstall.mockResolvedValue({ ok: true, value: { application: 'applied', bundle: 'shared-workbench', version: '1.0.0' } })
  await act(async () => ui.button('Query installation result').click())
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  expect(ui.manager.waitForInstall).toHaveBeenCalledWith(ui.service.localInstall.requestId)
  expect(ui.onInstalled).toHaveBeenCalledOnce()
  expect(dom.window.document.querySelector('[role=dialog]')).toBeNull()
})
it('recovers the actual manager terminal receipt after transport loses the final reply', async () => {
  const ui = await mount('en')
  const manager = Object.assign(Object.create(PluginManager.prototype), {
    installs: new Map(),
    ownerContext: { emit: vi.fn() },
    change: vi.fn(async () => ({ application: 'applied', bundle: 'shared-workbench', version: '1.0.0' }))
  })
  ui.manager.installBundle.mockImplementation(async (spec, options) => {
    await manager.installBundle(spec, options)
    throw new Error('Terminal RPC reply lost')
  })
  ui.manager.waitForInstall.mockImplementation(async id => ({ ok: true, value: await manager.waitForInstall(id) }))
  await ui.openUpload()
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  expect(manager.installs.size).toBe(0)
  expect(ui.service.localInstall.phase).toBe('unknown')
  await act(async () => ui.button('Query installation result').click())
  expect(ui.service.localInstall.phase).toBe('installed')
  expect(ui.onInstalled).toHaveBeenCalledOnce()
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  expect(manager.change).toHaveBeenCalledOnce()
})
it.each(['shared.tgz', 'another.tgz', 'unsupported.zip'])('retains the unresolved task when reselecting %s and queries after reopening', async name => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  const original = ui.service.localInstall
  expect(original).toMatchObject({ phase: 'unknown', requestId: expect.any(String) })
  expect(dom.window.document.querySelector('input[type=file]').disabled).toBe(true)
  expect(dom.window.document.querySelector('.dshWbDropzone').disabled).toBe(true)
  await selectFile(name)
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(drop, 'dataTransfer', { value: { files: [new dom.window.File([], name), new dom.window.File([], 'extra.tgz')] } })
  await act(async () => dom.window.document.querySelector('.dshWbDropzone').dispatchEvent(drop))
  await act(async () => {
    ui.service.selectWorkbenchPackage(new dom.window.File([], name))
    await ui.service.installWorkbenchPackage()
  })
  expect(ui.service.localInstall).toEqual(original)
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  await act(async () => ui.button('Close').click())
  await ui.openUpload()
  expect(ui.service.localInstall.requestId).toBe(original.requestId)
  ui.manager.waitForInstall.mockRejectedValueOnce(new Error('Still disconnected'))
  await act(async () => ui.button('Query installation result').click())
  expect(ui.service.localInstall).toMatchObject({ phase: 'unknown', requestId: original.requestId, file: original.file })
  ui.manager.waitForInstall.mockResolvedValueOnce({ ok: true, value: null })
  await act(async () => ui.button('Query installation result').click())
  expect(ui.service.localInstall).toMatchObject({ phase: 'unknown', requestId: original.requestId, file: original.file })
  ui.manager.waitForInstall.mockResolvedValueOnce({ ok: true, value: { application: 'applied', bundle: 'shared-workbench', version: '1.0.0' } })
  await act(async () => ui.button('Query installation result').click())
  expect(ui.manager.waitForInstall.mock.calls.map(([id]) => id)).toEqual([original.requestId, original.requestId, original.requestId])
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  expect(ui.onInstalled).toHaveBeenCalledOnce()
})
it.each(['failed', 'cancelled'])('allows a new package and retry after querying a terminal %s result', async application => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockRejectedValueOnce(new Error('Connection lost'))
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  const requestId = ui.service.localInstall.requestId
  ui.manager.waitForInstall.mockResolvedValueOnce({ ok: true, value: { application } })
  await act(async () => ui.button('Query installation result').click())
  expect(ui.manager.waitForInstall).toHaveBeenCalledWith(requestId)
  await selectFile('another.tgz')
  expect(ui.service.localInstall).toMatchObject({ phase: 'selected', requestId: null })
  await act(async () => ui.button('Confirm installation').click())
  expect(ui.manager.installBundle).toHaveBeenCalledTimes(2)
  expect(ui.manager.installBundle).toHaveBeenLastCalledWith('/tmp/another.tgz', expect.objectContaining({ enabled: true }))
  expect(ui.manager.installBundle.mock.calls[1][1].requestId).not.toBe(requestId)
})
it('requires a separate user action to approve pending installation scripts', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  ui.manager.installBundle.mockResolvedValueOnce({ ok: true, value: { application: 'failed', pendingBuilds: ['build-component'], packageResult: { output: 'Scripts blocked' } } })
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  expect(ui.text()).toContain('build-component')
  expect(ui.manager.installBundle).toHaveBeenCalledOnce()
  await act(async () => ui.button('Allow these installation scripts and retry').click())
  expect(ui.manager.installBundle).toHaveBeenLastCalledWith('/tmp/shared.tgz', expect.objectContaining({ approvedBuilds: ['build-component'] }))
})
it('waits for the installed list refresh before navigating and keeps restart status', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  let refreshed
  ui.service.refreshNative.mockImplementation(() => new Promise(resolve => { refreshed = resolve }))
  ui.manager.installBundle.mockResolvedValue({ ok: true, value: { application: 'restart-required', bundle: 'shared-workbench', version: '1.0.0' } })
  await selectFile()
  await act(async () => ui.button('Confirm installation').click())
  expect(ui.onInstalled).not.toHaveBeenCalled()
  await act(async () => refreshed())
  expect(ui.service.restartNeeded).toBe(true)
  expect(ui.onInstalled).toHaveBeenCalledOnce()
})
it('supports dropping a package and closing through the shared dialog', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  const zone = dom.window.document.querySelector('.dshWbDropzone')
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(drop, 'dataTransfer', { value: { files: [new dom.window.File(['package'], 'dropped.tgz')] } })
  await act(async () => zone.dispatchEvent(drop))
  expect(ui.text()).toContain('dropped.tgz')
  expect(ui.manager.installBundle).not.toHaveBeenCalled()
  await act(async () => dom.window.document.querySelector('[role=dialog] button[aria-label=Close]').click())
  expect(dom.window.document.querySelector('[role=dialog]')).toBeNull()
  expect(ui.onInstalled).not.toHaveBeenCalled()
})
it('rejects multiple dropped packages', async () => {
  const ui = await mount('en')
  await ui.openUpload()
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(drop, 'dataTransfer', { value: { files: [new dom.window.File([], 'one.tgz'), new dom.window.File([], 'two.tgz')] } })
  await act(async () => dom.window.document.querySelector('.dshWbDropzone').dispatchEvent(drop))
  expect(ui.text()).toContain('Choose one workbench package at a time')
  expect(ui.button('Retry installation').disabled).toBe(true)
})
it.each([
  ['https://github.com/owner/workbench', 'git'], ['github:owner/workbench', 'git'],
  ['workbench-package@1.0.0', 'registry'], ['/tmp/workbench.tgz', 'tarball'],
  ['/tmp/workbench.tar.gz', 'tarball'], ['/tmp/workbench-folder', 'path'],
  ['https://example.com/workbench.tgz', 'tarball']
])('keeps source %s aligned with the installed plugin manager parser', (spec, kind) => {
  expect(parseInstallSpec(spec).kind).toBe(kind)
})
