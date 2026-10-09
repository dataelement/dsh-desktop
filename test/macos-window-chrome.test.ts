// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { mountMacosWindowChrome } from '../src/preload/macos-window-chrome'

it('marks the platform before mount and tracks fullscreen without retaining listeners', () => {
  const doc = document.implementation.createHTMLDocument()
  const unsubscribe = vi.fn()
  let receive: (value: boolean) => void = () => {}
  const dispose = mountMacosWindowChrome(doc, listener => { receive = listener; return unsubscribe })
  expect(doc.querySelector('[data-dsh-macos-sidebar-theme]')).not.toBeNull()
  expect(doc.documentElement.dataset.platform).toBe('darwin')
  expect(doc.documentElement.hasAttribute('data-fullscreen')).toBe(false)
  receive(true)
  expect(doc.documentElement.dataset.fullscreen).toBe('true')
  receive(false)
  expect(doc.documentElement.hasAttribute('data-fullscreen')).toBe(false)
  dispose()
  expect(unsubscribe).toHaveBeenCalledOnce()
  expect(doc.querySelector('[data-dsh-macos-sidebar-theme]')).toBeNull()
})

it('retains fullscreen until the document root exists', () => {
  const doc = document.implementation.createHTMLDocument()
  const root = doc.documentElement
  root.remove()
  let receive: (value: boolean) => void = () => {}
  const dispose = mountMacosWindowChrome(doc, listener => { receive = listener; return () => {} })
  receive(true)
  doc.append(root)
  doc.dispatchEvent(new Event('DOMContentLoaded'))
  expect(root.dataset.platform).toBe('darwin')
  expect(root.dataset.fullscreen).toBe('true')
  dispose()
})

it('opts this host into Web shortcuts without changing official desktop detection', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile('node_modules/@deepseek-ai/dsh-client-shortcuts/lib/client.js', 'utf8')
  const fn = source.match(/function detectEnvironment\(document, navigator\) \{[\s\S]*?\n\t\t\}/)?.[0]
  expect(fn).toBeDefined()
  const detect = new Function(`${fn}; return detectEnvironment`)()
  const doc = document.implementation.createHTMLDocument()
  doc.documentElement.dataset.platform = 'darwin'
  expect(detect(doc, { platform: 'MacIntel' })).toEqual({ runtime: 'desktop', platform: 'macos' })
  const dispose = mountMacosWindowChrome(doc, () => () => {})
  expect(detect(doc, { platform: 'MacIntel' })).toEqual({ runtime: 'web', platform: 'macos' })
  dispose()
})

it('shares sidebar theme ownership across repeated mounts', () => {
  const doc = document.implementation.createHTMLDocument()
  const first = mountMacosWindowChrome(doc, () => () => {})
  const second = mountMacosWindowChrome(doc, () => () => {})
  expect(doc.querySelectorAll('[data-dsh-macos-sidebar-theme]')).toHaveLength(1)
  first()
  expect(doc.querySelectorAll('[data-dsh-macos-sidebar-theme]')).toHaveLength(1)
  second()
  expect(doc.querySelectorAll('[data-dsh-macos-sidebar-theme]')).toHaveLength(0)
})
