import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { auditStartupEntries, StartupError } from '@deepseek-ai/dsh-app-boot'

const sidebarPath = new URL('../node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js', import.meta.url)
const conversationPath = new URL('../node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', import.meta.url)

function loadSidebar() {
  let exports
  const document = {
    documentElement: { hasAttribute: () => false },
    querySelector: () => null,
    createElement: () => ({ dataset: {} }),
    head: { appendChild: () => {} }
  }
  const window = {
    setTimeout,
    clearTimeout,
    __ModuleLoader__: { load: ({ factory }) => {
      exports = factory(name => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') return jsxRuntime
        if (name === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: initial => ({ getSnapshot: () => initial, set: () => {} }) }
        if (name === '@deepseek-ai/dsh-client-ui-slots') return { resolveSlotLabel: value => value }
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({ isDarwinDesktop: () => false, Tooltip: ({ children }) => children }, { get: (target, key) => target[key] ?? (() => null) })
        throw new Error(`Unexpected module ${name}`)
      })
    } }
  }
  return readFile(sidebarPath, 'utf8').then(code => {
    vm.runInNewContext(code, { window, document })
    return exports
  })
}

describe('rc.2 workbench patch slots', () => {
  it('declares and renders the quick switcher between New Session and the native panel navigation with the native action', async () => {
    const sidebar = await loadSidebar()
    const registrations = []
    const startSession = vi.fn()
    const ctx = {
      get: () => ({ startSession }),
      effect: () => {},
      locale: { register: () => {}, subscribe: () => {} },
      slots: {
        entriesOfSlot: () => [], subscribe: () => {},
        inject: (_name, callback) => callback(),
        register: (options, Component) => registrations.push({ options, Component })
      },
      shortcuts: { catalog: {} },
      layout: { toggleSidebar: () => {}, selectPanel: () => {} }
    }
    sidebar.apply(ctx)
    const shell = registrations.find(item => item.options.name === 'sidebar')
    expect(shell.options.children['sidebar.quickSwitcher']).toEqual({ kind: 'single', scope: 'root' })
    const rendered = []
    const markup = renderToStaticMarkup(React.createElement(shell.Component, {
      collapsed: false, width: 250, startSession, toggleSidebar: () => {}, selectPanel: () => {},
      usePanels: () => [{ id: 'plugins', label: '插件' }], useShortcuts: () => [], usePanelInfo: () => ({}), t: key => key,
      renderSlot: (name, owner) => {
        rendered.push({ name, owner })
        return name === 'sidebar.quickSwitcher' ? React.createElement('span', null, 'Workbench switcher') : null
      }
    }))
    expect(markup).toContain('Workbench switcher')
    expect(markup.indexOf('Workbench switcher')).toBeGreaterThan(markup.indexOf('class="hHd-Xa_newSession"'))
    expect(markup.indexOf('Workbench switcher')).toBeLessThan(markup.indexOf('class="hHd-Xa_panelList"'))
    expect(rendered.find(item => item.name === 'sidebar.quickSwitcher')?.owner).toEqual({ wide: true, startSession })
    expect(rendered.findIndex(item => item.name === 'sidebar.quickSwitcher')).toBeGreaterThan(-1)
  })

  it('isolates a failed optional workbench without hiding a failed core entry', async () => {
    const makeEntry = (id, workbench) => ({
      disabled: false,
      options: { id, name: id, __dshPluginOwner: workbench ? { workbench: true } : undefined },
      lastImportError: new Error(`${id} import failed`),
      _failure: () => new Error(`${id} failed`)
    })
    const optional = makeEntry('third-party-workbench', true)
    const warnings = []
    await expect(auditStartupEntries({ loader: { entries: () => [optional] } }, 'test', line => warnings.push(line))).resolves.toBeUndefined()
    expect(warnings.join('')).toContain('third-party-workbench')
    const core = makeEntry('webserver', false)
    await expect(auditStartupEntries({ loader: { entries: () => [optional, core] } }, 'test', () => {})).rejects.toBeInstanceOf(StartupError)
  })

  it('keeps the native conversation as fallback for the workbench frame', async () => {
    const source = await readFile(conversationPath, 'utf8')
    expect(source).toContain('return renderSlot("desktop.workbench.frame", { conversation }, { fallback: conversation });')
    expect(source).toContain('"desktop.workbench.frame": { kind: "single", scope: "root" }')
  })
})
