// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { mountMacosWindowTheme } from '../src/preload/macos-window-theme'

it('synchronizes fixed themes and system preference changes even when the resolved palette stays dark', async () => {
  const doc = document.implementation.createHTMLDocument()
  const ipc = { invoke: vi.fn().mockResolvedValue({ ok: true }) }
  doc.documentElement.setAttribute('data-ds-theme-source', 'light')
  const dispose = mountMacosWindowTheme(doc, ipc)
  try {
    expect(ipc.invoke).toHaveBeenLastCalledWith('desktop-titlebar:set-theme', false, 'light')
    doc.documentElement.setAttribute('data-ds-theme-source', 'dark')
    doc.body.setAttribute('data-ds-dark-theme', '')
    await Promise.resolve()
    expect(ipc.invoke).toHaveBeenLastCalledWith('desktop-titlebar:set-theme', true, 'dark')

    doc.documentElement.setAttribute('data-ds-theme-source', 'system')
    await Promise.resolve()
    expect(ipc.invoke).toHaveBeenLastCalledWith('desktop-titlebar:set-theme', true, 'system')
    doc.body.removeAttribute('data-ds-dark-theme')
    await Promise.resolve()
    expect(ipc.invoke).toHaveBeenLastCalledWith('desktop-titlebar:set-theme', false, 'system')
  } finally {
    dispose()
  }
  ipc.invoke.mockClear()
  doc.documentElement.setAttribute('data-ds-theme-source', 'light')
  doc.body.setAttribute('data-ds-dark-theme', '')
  await Promise.resolve()
  expect(ipc.invoke).not.toHaveBeenCalled()
})

it('keeps the native preference when startup pages have no Harness theme source', () => {
  const doc = document.implementation.createHTMLDocument()
  const ipc = { invoke: vi.fn().mockResolvedValue({ ok: true }) }
  const dispose = mountMacosWindowTheme(doc, ipc)
  expect(ipc.invoke).toHaveBeenCalledWith('desktop-titlebar:set-theme', false, undefined)
  dispose()
})
