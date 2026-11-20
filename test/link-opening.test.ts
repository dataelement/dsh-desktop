import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface LinkPlugin {
  apply: (ctx: unknown) => void
  readHttpLink: (value: string, baseHref: string) => string | undefined
  configuredLinkDestination: (linkOpening: unknown, browserAvailable: boolean) => 'sidebar' | 'external'
  linkClickFollowsSetting: (event: ClickEvent, baseHref: string) => string | undefined
}

interface ClickEvent {
  defaultPrevented?: boolean
  button?: number
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  target?: unknown
  preventDefault: () => void
}

function loadPlugin(page: {
  addEventListener?: (type: string, listener: (event: ClickEvent) => void) => void
  removeEventListener?: (type: string, listener: (event: ClickEvent) => void) => void
  location?: { href: string }
  open?: (url: string, target: string, features: string) => void
}): LinkPlugin {
  let definition: { factory: (require: (id: string) => unknown) => LinkPlugin } | undefined
  const source = readFileSync(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
  const window = {
    dshDesktop: {},
    __ModuleLoader__: { load: (value: typeof definition) => { definition = value } },
    ...page
  }
  vm.runInNewContext(source, {
    URL,
    window,
    document: { getElementById: () => null, createElement: () => ({ remove() {} }), head: { appendChild() {} } }
  })
  return definition!.factory(() => ({ createElement: () => null, useEffect: () => undefined, useState: () => [undefined, () => undefined], useRef: () => ({ current: undefined }) }))
}

function anchor(href: string, download = false) {
  return {
    href,
    hasAttribute: (name: string) => download && name === 'download',
    getAttribute: (name: string) => name === 'href' ? href : null,
    closest(selector: string) { return selector === 'a[href]' ? this : undefined }
  }
}

function click(target: unknown, extra: Partial<ClickEvent> = {}): ClickEvent {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target,
    preventDefault() { this.defaultPrevented = true },
    ...extra
  }
}

describe('configured http link clicks', () => {
  const plugin = loadPlugin({})
  const base = 'dsh-app://app/'

  it('accepts plain http(s) addresses and refuses other schemes or credentials', () => {
    expect(plugin.readHttpLink('https://example.com/docs', base)).toBe('https://example.com/docs')
    expect(plugin.readHttpLink('http://example.com/a', base)).toBe('http://example.com/a')
    expect(plugin.readHttpLink('mailto:a@example.com', base)).toBeUndefined()
    expect(plugin.readHttpLink('dsh-app://app/session', base)).toBeUndefined()
    expect(plugin.readHttpLink('https://user:secret@example.com', base)).toBeUndefined()
    expect(plugin.readHttpLink('', base)).toBeUndefined()
  })

  it('prefers the docked sidebar only when that setting is active and the browser tab exists', () => {
    expect(plugin.configuredLinkDestination('sidebar', true)).toBe('sidebar')
    expect(plugin.configuredLinkDestination(undefined, true)).toBe('sidebar')
    expect(plugin.configuredLinkDestination('sidebar', false)).toBe('external')
    expect(plugin.configuredLinkDestination('new-tab', true)).toBe('external')
  })

  it('leaves modifier clicks, the middle button, downloads, and handled clicks alone', () => {
    const link = anchor('https://example.com/docs')
    expect(plugin.linkClickFollowsSetting(click(link), base)).toBe('https://example.com/docs')
    expect(plugin.linkClickFollowsSetting(click(link, { metaKey: true }), base)).toBeUndefined()
    expect(plugin.linkClickFollowsSetting(click(link, { ctrlKey: true }), base)).toBeUndefined()
    expect(plugin.linkClickFollowsSetting(click(link, { shiftKey: true }), base)).toBeUndefined()
    expect(plugin.linkClickFollowsSetting(click(link, { button: 1 }), base)).toBeUndefined()
    expect(plugin.linkClickFollowsSetting(click(link, { defaultPrevented: true }), base)).toBeUndefined()
    expect(plugin.linkClickFollowsSetting(click(anchor('https://example.com/file', true)), base)).toBeUndefined()
  })

  it('opens an unhandled plain click in the docked sidebar when that is the setting', () => {
    const listeners = new Map<string, (event: ClickEvent) => void>()
    const opened: unknown[] = []
    const external = vi.fn()
    let linkOpening: unknown = 'sidebar'
    let browser = true
    const page = loadPlugin({
      location: { href: base },
      open: external,
      addEventListener: (type, listener) => { listeners.set(type, listener) },
      removeEventListener: (type, listener) => { if (listeners.get(type) === listener) listeners.delete(type) }
    })
    const disposers: Array<() => void> = []
    page.apply({
      locale: { register: () => undefined, bind: () => (key: string) => key },
      slots: { inject: (_name: string, callback: () => unknown) => callback(), register: () => () => undefined },
      effect: (setup: () => (() => void) | undefined) => {
        const dispose = setup()
        if (typeof dispose === 'function') disposers.push(dispose)
      },
      configForms: { get: () => ({ getSnapshot: () => ({ value: { linkOpening } }) }) },
      sidebarRight: { openTab: (...args: unknown[]) => { opened.push(args) } },
      sidebarRightTabs: { get: (id: string) => browser && id === 'browser' ? {} : undefined }
    })
    const listener = listeners.get('click')
    expect(listener).toBeTypeOf('function')
    const event = click(anchor('https://example.com/docs'))
    listener!(event)
    expect(event.defaultPrevented).toBe(true)
    expect(opened).toEqual([['browser', { params: { url: 'https://example.com/docs' }, revealIfOpened: false }]])
    expect(external).not.toHaveBeenCalled()

    opened.length = 0
    linkOpening = 'new-tab'
    const externalEvent = click(anchor('https://github.com/deepseek-ai/deepseek-harness'))
    listener!(externalEvent)
    expect(external).toHaveBeenCalledExactlyOnceWith('https://github.com/deepseek-ai/deepseek-harness', '_blank', 'noopener,noreferrer')
    expect(opened).toEqual([])

    external.mockClear()
    linkOpening = 'sidebar'
    browser = false
    listener!(click(anchor('https://example.com/fallback')))
    expect(external).toHaveBeenCalledOnce()
    expect(opened).toEqual([])

    external.mockClear()
    listener!(click(anchor('https://example.com/docs'), { metaKey: true }))
    expect(external).not.toHaveBeenCalled()
    expect(opened).toEqual([])

    for (const dispose of disposers) dispose()
    expect(listeners.has('click')).toBe(false)
  })
})

describe('sidebar browser popup docking', () => {
  it('sends guest new windows to the docked sidebar instead of the current pane', () => {
    const source = readFileSync(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-sidebar-browser', 'lib', 'client.js'),
      'utf8'
    )
    expect(source).toContain('openTab:url=>{props.openDocked(url)}')
    expect(source).toContain('controller.openDocked=url=>ctx.sidebarRight.openTab(`browser`,{params:{url},revealIfOpened:false})')
    expect(source).not.toContain('tab.actions.openTab(`browser`')
    expect(source).toContain('window.open(externalUrl,`_blank`,`noopener,noreferrer`)')
  })
})
