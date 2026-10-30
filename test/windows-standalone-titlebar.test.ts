// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://desktop.test/"}
import { afterEach, expect, it, vi } from 'vitest'
import { mountWindowsTitlebarLayout } from '../src/preload/windows-titlebar'

// Vitest copies window globals during environment setup, including storage.
// A file: origin makes jsdom's storage getters throw before the tests can run.
// Reconfigure the real document only after setup so the layout still exercises
// the production file: branch, and restore it before environment teardown.
declare const jsdom: { reconfigure(options: { url: string }): void }

const observers: MutationObserver[] = []

afterEach(() => {
  // Mounting installs long-lived observers; stop them before jsdom closes.
  for (const observer of observers.splice(0)) observer.disconnect()
  jsdom.reconfigure({ url: 'https://desktop.test/' })
  vi.unstubAllGlobals()
})

it('reserves the caption row on standalone recovery pages before mounting menus', () => {
  jsdom.reconfigure({ url: 'file:///desktop/plugin-recovery.html' })
  expect(document.location.protocol).toBe('file:')
  vi.stubGlobal('MutationObserver', class extends MutationObserver {
    constructor(callback: MutationCallback) {
      super(callback)
      observers.push(this)
    }
  })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }))
  document.body.innerHTML = '<div class="shell"><header>DSH Desktop</header></div>'
  mountWindowsTitlebarLayout({ document, ipcRenderer: { invoke: vi.fn(async () => undefined) } })
  expect(document.body.hasAttribute('data-dsh-standalone-titlebar')).toBe(true)
  expect(getComputedStyle(document.body).paddingTop).toBe('40px')
  expect(document.querySelector('[data-dsh-windows-menu]')).not.toBeNull()
  const shell = document.querySelector<HTMLElement>('.shell')
  if (!shell) throw new Error('standalone shell missing')
  expect(getComputedStyle(shell).height).toBe('100%')
})
