// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { mountWindowsMenuBar } from '../src/preload/windows-menu-bar'

afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.removeAttribute('lang')
})

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const host = (): HTMLElement | null => document.querySelector('[data-dsh-windows-menu]')
const button = (name: string): HTMLButtonElement | null =>
  host()?.shadowRoot?.querySelector<HTMLButtonElement>(`button[data-menu="${name}"]`) ?? null

it('waits for the Harness shell overlay before taking the caption seat', async () => {
  const invoke = vi.fn(async () => undefined)
  const menu = mountWindowsMenuBar({ document, ipcRenderer: { invoke } })
  expect(host()).toBeNull()

  const overlay = document.createElement('div')
  overlay.setAttribute('data-shell-overlay', '')
  document.body.append(overlay)
  await flush()

  expect(host()).not.toBeNull()
  expect(host()?.hasAttribute('data-standalone')).toBe(false)
  menu.dispose()
  expect(host()).toBeNull()
})

it('opens the native popup under the pressed button and labels it in the page language', async () => {
  document.documentElement.lang = 'zh-CN'
  document.body.append(document.createElement('div'))
  document.body.lastElementChild?.setAttribute('data-shell-overlay', '')
  const invoke = vi.fn(async () => undefined)
  const menu = mountWindowsMenuBar({ document, ipcRenderer: { invoke } })

  expect(button('application')?.textContent).toBe('应用')
  expect(button('edit')?.textContent).toBe('编辑')

  const edit = button('edit')
  if (!edit) throw new Error('edit menu button was not mounted')
  edit.getBoundingClientRect = () => ({ left: 120, bottom: 34 } as DOMRect)
  edit.click()
  expect(edit.getAttribute('aria-expanded')).toBe('true')
  await flush()
  expect(invoke).toHaveBeenCalledWith('desktop-titlebar:popup-menu', 'edit', 120, 34)
  expect(edit.getAttribute('aria-expanded')).toBe('false')

  document.documentElement.lang = 'en'
  await flush()
  expect(button('application')?.textContent).toBe('Application')
  menu.dispose()
})

it('mounts only once per document', () => {
  document.body.append(document.createElement('div'))
  document.body.lastElementChild?.setAttribute('data-shell-overlay', '')
  const invoke = vi.fn(async () => undefined)
  const first = mountWindowsMenuBar({ document, ipcRenderer: { invoke } })
  mountWindowsMenuBar({ document, ipcRenderer: { invoke } })
  expect(document.querySelectorAll('[data-dsh-windows-menu]')).toHaveLength(1)
  first.dispose()
})

it('marks <html> as soon as the parser creates it when preload runs first', async () => {
  const { markWindowsTitlebar } = await import('../src/preload/windows-titlebar')
  const doc = document.implementation.createDocument(null, null)
  markWindowsTitlebar(doc)
  const html = doc.createElementNS('http://www.w3.org/1999/xhtml', 'html') as HTMLElement
  doc.append(html)
  await flush()
  expect(html.hasAttribute('data-windows-titlebar')).toBe(true)
  expect(html.style.getPropertyValue('--dsh-windows-titlebar-height')).toBe('40px')
})
