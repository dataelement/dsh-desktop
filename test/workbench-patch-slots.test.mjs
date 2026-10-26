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
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({ isDarwinDesktop: () => false, Tooltip: ({ children }) => children, Menu: ({ anchor, children }) => React.createElement(React.Fragment, null, anchor, children) }, { get: (target, key) => target[key] ?? (() => null) })
        throw new Error(`Unexpected module ${name}`)
      })
    } }
  }
  return readFile(sidebarPath, 'utf8').then(code => {
    vm.runInNewContext(code, { window, document })
    return exports
  })
}

describe('rc.3 workbench patch slots', () => {
  it.each([
    { panels: [], unpinned: [], hasActions: false },
    { panels: [{ id: 'plugins', label: 'Plugins' }], unpinned: [], hasActions: false },
    { panels: [{ id: 'plugins', label: 'Plugins' }, { id: 'schedules', label: 'Schedules' }, { id: 'custom', label: 'Custom panel' }], unpinned: ['plugins', 'schedules'], hasActions: true }
  ])('keeps one quick switcher and its native action alongside rc3 panel pinning: $hasActions / $unpinned', async ({ panels, unpinned, hasActions }) => {
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
    expect(shell.options.children['sidebar.panellist.actions']).toEqual({ kind: 'list', scope: 'root' })
    expect(shell.options.children['sidebar.settings']).toEqual({ kind: 'single', scope: 'root' })
    expect(shell.options.children['sidebar.settings.action']).toEqual({ kind: 'list', scope: 'root' })
    const selectPanel = vi.fn()
    const setPinned = vi.fn()
    const trackEntryClick = vi.fn()
    const rendered = []
    const markup = renderToStaticMarkup(React.createElement(shell.Component, {
      collapsed: false, width: 250, startSession, toggleSidebar: () => {}, selectPanel, setPinned, trackEntryClick,
      usePanels: () => panels, useEntryPins: () => unpinned, useEntryActions: () => hasActions,
      useShortcuts: () => [], usePanelInfo: selector => selector({ activePanelId: 'schedules' }), t: key => key,
      renderSlot: (name, owner) => {
        rendered.push({ name, owner })
        if (name === 'sidebar.quickSwitcher') return React.createElement('span', null, 'Workbench switcher')
        if (name === 'sidebar.settings') return React.createElement('button', null, 'Settings contribution')
        if (name === 'sidebar.settings.action') return React.createElement('button', null, 'Recovery contribution')
        return null
      }
    }))
    expect(markup).toContain('Workbench switcher')
    expect(markup).toContain('<div data-dsh-sidebar-settings-content=""><button>Settings contribution</button></div>')
    expect(markup).toContain('<div data-dsh-sidebar-settings-actions=""><button>Recovery contribution</button></div>')
    expect(markup.match(/data-dsh-sidebar-settings=""/g)).toHaveLength(1)
    expect(markup.match(/data-dsh-sidebar-settings-content=""/g)).toHaveLength(1)
    expect(markup.match(/data-dsh-sidebar-settings-actions=""/g)).toHaveLength(1)
    for (const name of ['sidebar.settings', 'sidebar.settings.action']) {
      const contributions = rendered.filter(item => item.name === name)
      expect(contributions).toHaveLength(1)
      expect(contributions[0].owner).toEqual({ wide: true })
    }
    expect(markup.indexOf('Workbench switcher')).toBeGreaterThan(markup.indexOf('class="hHd-Xa_newSession"'))
    if (panels.length) expect(markup.indexOf('Workbench switcher')).toBeLessThan(markup.indexOf('class="hHd-Xa_panelList"'))
    const switchers = rendered.filter(item => item.name === 'sidebar.quickSwitcher')
    expect(switchers).toHaveLength(1)
    expect(switchers[0].owner).toEqual({ wide: true, startSession })
    switchers[0].owner.startSession('workspace-test')
    expect(startSession).toHaveBeenCalledWith('workspace-test')
    expect(trackEntryClick).not.toHaveBeenCalled()
    const more = rendered.filter(item => item.name === 'sidebar.panellist.actions')
    expect(more).toHaveLength(hasActions && panels.length ? 1 : 0)
    if (hasActions) {
      expect(markup).toContain('aria-label="Plugins"')
      expect(markup).toContain('aria-label="Custom panel"')
      expect(markup).not.toContain('aria-label="Schedules"')
      expect(more[0].owner.entries).toEqual([
        { id: 'schedules', label: 'Schedules', pinned: false, active: true },
        { id: 'custom', label: 'Custom panel', pinned: true, active: false }
      ])
      more[0].owner.onPinnedChange('schedules', true)
      expect(setPinned).toHaveBeenCalledWith('schedules', true)
      more[0].owner.onOpen('schedules')
      expect(selectPanel).toHaveBeenCalledWith('schedules')
      expect(trackEntryClick).toHaveBeenCalledExactlyOnceWith({ menu_name: 'cron', position: 'sidebar_more' })
      more[0].owner.onOpen('custom')
      expect(selectPanel).toHaveBeenLastCalledWith('custom')
      expect(trackEntryClick).toHaveBeenCalledTimes(1)
    }
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
