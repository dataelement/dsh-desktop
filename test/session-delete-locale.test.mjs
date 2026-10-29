// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import React, { act } from 'react'
import * as ReactDOM from 'react-dom'
import * as jsxRuntime from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const source = readFileSync(process.env.DSH_TEST_DELETE_CLIENT_SOURCE ?? 'packages/dsh-desktop-client-ui/client.js', 'utf8')
let primitives, cleanup
beforeAll(async () => {
  // Exercise the installed Modal/Menu/Button behavior; CSS has no layout in jsdom.
  // The distributed ESM also initializes unrelated markdown highlighters. Load
  // the UI prefix through Modal, keeping its implementations and focus helpers.
  const bundle = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { build } from 'esbuild'; import { readFileSync } from 'node:fs'; import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const source = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8');
    const boundary = source.indexOf('//#region lib/types/RiskConfirmation.js');
    if (boundary < 0) throw new Error('Recheck the installed primitive layout');
    const result = await build({ stdin: { contents: source.slice(0, boundary) + '\\nexport { Modal, Menu, MenuItemButton, Button };', resolveDir: process.cwd() },
      bundle: true, write: false, format: 'cjs', platform: 'browser',
      plugins: [{ name: 'ui-only', setup(build) {
        build.onResolve({ filter: /\\.css$/ }, args => ({ path: args.path, namespace: 'css' }));
        build.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default {}', loader: 'js' }));
        build.onResolve({ filter: /^[^./]/ }, args => ({ path: args.path, external: true, sideEffects: false }));
      } }]
    }); process.stdout.write(result.outputFiles[0].text)`
  ], { encoding: 'utf8', maxBuffer: 4_000_000 })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', bundle)(module, module.exports, name => {
    if (name === 'react') return React
    if (name === 'react-dom') return ReactDOM
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === 'clsx') return (...values) => values.filter(Boolean).join(' ')
    throw new Error(name)
  })
  primitives = module.exports
})
afterEach(async () => { await cleanup?.(); cleanup = undefined; vi.restoreAllMocks() })

async function fixture({ language = 'zh', deleteSession = vi.fn(async () => {}) } = {}) {
  let plugin, locale = language
  const entries = new Map(), dictionaries = new Map(), disposers = []
  const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => { throw new Error('Native confirmation invoked') })
  const nativeAlert = vi.spyOn(window, 'alert').mockImplementation(() => { throw new Error('Native alert invoked') })
  new Function('window', source)({ __ModuleLoader__: { load({ factory }) {
    plugin = factory(name => {
      if (name === 'react') return React
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
      throw new Error(name)
    })
  } } })
  plugin.apply({
    get: name => { expect(name).toBe('uiWorkspace'); return { deleteSession } },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    locale: {
      register(ns, dictionary) { dictionaries.set(ns, dictionary); return () => dictionaries.delete(ns) },
      bind: ns => (key, args = {}) => dictionaries.get(ns)[locale][key].replace(/\{(\w+)\}/g, (_, name) => args[name])
    },
    slots: {
      inject(name, fn) { if (['shell.overlay', 'sidebar.workspaces.session.menu.item'].includes(name)) fn() },
      register(meta, Component) { entries.set(meta.id, { meta, Component }); return () => {} }
    }
  })
  const menu = entries.get('desktop-delete-session'), overlay = entries.get('desktop-delete-session-dialog')
  expect(menu.meta.locale).toBe(overlay.meta.locale)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let mounted = true
  const menuProps = menu.meta.inject(), overlayProps = overlay.meta.inject()
  function App() {
    const [open, setOpen] = React.useState(false)
    return React.createElement(React.Fragment, null,
      React.createElement(primitives.Menu, {
        open, onClose: () => setOpen(false), portal: true,
        anchor: React.createElement('button', { onClick: () => setOpen(true), 'data-trigger': true }, 'Session actions')
      }, React.createElement(menu.Component, {
        ...menuProps, sessionId: 'session-a', displayTitle: '测试会话 <script>', useMenuOpenState: () => [open, setOpen]
      })),
      React.createElement(overlay.Component, overlayProps))
  }
  const render = () => root.render(React.createElement(App))
  await act(async () => render())
  const click = async label => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === label)
    expect(button, label).toBeDefined()
    await act(async () => button.click())
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  }
  cleanup = async () => {
    if (mounted) await act(async () => root.unmount())
    disposers.reverse().forEach(dispose => dispose())
    container.remove()
  }
  return {
    deleteSession, nativeConfirm, nativeAlert, click,
    dialog: () => document.querySelector('[role=dialog]'),
    open: async () => {
      document.querySelector('[data-trigger]').focus()
      await click('Session actions')
      await click(locale === 'zh' ? '永久删除会话' : 'Delete session permanently')
    },
    switchLanguage: async value => { locale = value; await act(async () => render()) },
    dispose: async () => {
      await act(async () => root.unmount())
      mounted = false
      disposers.reverse().splice(0).forEach(dispose => dispose())
    },
    deletion: overlayProps.deletion
  }
}

it.each(['zh', 'en'])('localizes the complete confirmation in %s after the menu unmounts', async language => {
  // Page/system language is intentionally different from the application's locale service.
  document.documentElement.lang = language === 'zh' ? 'en' : 'zh'
  const ui = await fixture({ language })
  await ui.open()
  const buttons = [...ui.dialog().querySelectorAll('button')]
  expect(buttons.map(node => node.textContent)).toEqual(language === 'zh' ? ['', '取消', '删除会话'] : ['', 'Cancel', 'Delete session'])
  expect(buttons[0].getAttribute('aria-label')).toBe(language === 'zh' ? '关闭' : 'Close')
  expect(ui.dialog().textContent).toContain('测试会话 <script>')
  expect(ui.dialog().querySelector('script')).toBeNull()
  expect(document.querySelector('[role=menu]')).toBeNull()
  expect(document.activeElement).toBe(buttons[1])
  await ui.click(language === 'zh' ? '取消' : 'Cancel')
  expect(ui.dialog()).toBeNull()
  expect(ui.deleteSession).toHaveBeenCalledTimes(0)
  expect(ui.nativeConfirm).toHaveBeenCalledTimes(0)
  expect(ui.nativeAlert).toHaveBeenCalledTimes(0)
})

it('updates an open confirmation when the application language changes', async () => {
  const ui = await fixture()
  await ui.open()
  await ui.switchLanguage('en')
  expect(ui.dialog().getAttribute('aria-label')).toBe('Delete session')
  await ui.click('Cancel')
  await ui.open()
  await ui.click('Delete session')
  expect(ui.deleteSession).toHaveBeenCalledExactlyOnceWith('session-a')
  expect(ui.dialog()).toBeNull()
})

it('keeps Tab inside the dialog and dismisses through Escape, close, and backdrop', async () => {
  const ui = await fixture()
  for (const close of ['escape', 'button', 'backdrop']) {
    await ui.open()
    const buttons = [...ui.dialog().querySelectorAll('button')]
    buttons.at(-1).focus()
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    expect(document.activeElement).toBe(buttons[0])
    await act(async () => {
      if (close === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      if (close === 'button') buttons[0].click()
      if (close === 'backdrop') ui.dialog().previousElementSibling.click()
    })
    expect(ui.dialog()).toBeNull()
    expect(document.activeElement).toBe(document.querySelector('[data-trigger]'))
  }
  expect(ui.deleteSession).toHaveBeenCalledTimes(0)
})

it('locks dismissal and duplicate submissions until the deletion finishes', async () => {
  let resolve
  const deleteSession = vi.fn(() => new Promise(done => { resolve = done }))
  const ui = await fixture({ deleteSession })
  await ui.open()
  await act(async () => { void ui.deletion.confirm(); void ui.deletion.confirm(); ui.deletion.close(); ui.deletion.request('session-b', 'Other') })
  expect(deleteSession).toHaveBeenCalledExactlyOnceWith('session-a')
  expect(document.querySelector('[role=status]').textContent).toBe('正在删除会话…')
  expect([...ui.dialog().querySelectorAll('button')].slice(1).every(button => button.disabled)).toBe(true)
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
  expect(ui.dialog()).toBeTruthy()
  await act(async () => resolve())
  expect(ui.dialog()).toBeNull()
})

it.each(['sync', 'async'])('shows %s failures in the dialog and supports retry', async mode => {
  const deleteSession = vi.fn().mockImplementationOnce(() => {
    if (mode === 'sync') throw new Error('permission denied')
    return Promise.reject(new Error('permission denied'))
  }).mockResolvedValue(undefined)
  const ui = await fixture({ deleteSession })
  await ui.open()
  await ui.click('删除会话')
  expect(document.querySelector('[role=alert]').textContent).toContain('删除失败，请重试。')
  expect(document.querySelector('[role=alert]').textContent).toContain('permission denied')
  expect(ui.nativeAlert).toHaveBeenCalledTimes(0)
  await ui.click('删除会话')
  expect(deleteSession).toHaveBeenCalledTimes(2)
  expect(ui.dialog()).toBeNull()
})

it('disposes the confirmation and ignores a late failure after plugin unload', async () => {
  let reject
  const ui = await fixture({ deleteSession: vi.fn(() => new Promise((_, fail) => { reject = fail })) })
  await ui.open()
  await ui.click('删除会话')
  await ui.dispose()
  await act(async () => reject(new Error('late failure')))
  expect(ui.deletion.getSnapshot()).toBeNull()
  await act(async () => ui.deletion.request('session-b', 'Other'))
  expect(ui.dialog()).toBeNull()
})
