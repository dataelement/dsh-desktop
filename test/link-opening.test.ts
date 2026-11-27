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
  conversationSessionId: (event: ClickEvent) => string | undefined
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
  stopPropagation: () => void
  propagationStopped?: boolean
}

function loadPlugin(page: {
  addEventListener?: (type: string, listener: (event: ClickEvent) => void, capture?: boolean) => void
  removeEventListener?: (type: string, listener: (event: ClickEvent) => void, capture?: boolean) => void
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
    stopPropagation() { this.propagationStopped = true },
    ...extra
  }
}

function sessionLink(href: string, sessionId: string | null) {
  const root = sessionId === null ? undefined : {
    getAttribute: (name: string) => name === 'data-conversation-session' ? sessionId : null
  }
  return {
    href,
    hasAttribute: () => false,
    getAttribute: (name: string) => name === 'href' ? href : null,
    closest(selector: string) {
      if (selector === 'a[href]') return this
      if (selector === '[data-conversation-session]') return root
      return undefined
    }
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

  it('reads the conversation that owns the clicked link', () => {
    expect(plugin.conversationSessionId(click(sessionLink('https://example.com/docs', 'session-a')))).toBe('session-a')
    expect(plugin.conversationSessionId(click(sessionLink('https://example.com/docs', '')))).toBeUndefined()
    expect(plugin.conversationSessionId(click(sessionLink('https://example.com/docs', null)))).toBeUndefined()
    expect(plugin.conversationSessionId(click(anchor('https://example.com/docs')))).toBeUndefined()
  })

  it('opens a conversation link with that session and leaves links outside it alone', () => {
    const listeners = new Map<string, { listener: (event: ClickEvent) => void, capture?: boolean }>()
    const opened: unknown[] = []
    const external = vi.fn()
    let linkOpening: unknown = 'sidebar'
    let browser = true
    const page = loadPlugin({
      location: { href: base },
      open: external,
      addEventListener: (type, listener, capture) => { listeners.set(type, { listener, capture }) },
      removeEventListener: (type, listener, capture) => {
        const registered = listeners.get(type)
        if (registered?.listener === listener && registered.capture === capture) listeners.delete(type)
      }
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
      sidebarRight: { openTabIn: (...args: unknown[]) => { opened.push(args) } },
      sidebarRightTabs: { get: (id: string) => browser && id === 'browser' ? {} : undefined }
    })
    const registered = listeners.get('click')
    expect(registered?.capture).toBe(true)
    const listener = registered!.listener
    const event = click(sessionLink('https://example.com/docs', 'session-a'))
    listener(event)
    expect(event.defaultPrevented).toBe(true)
    expect(event.propagationStopped).toBe(true)
    expect(opened).toEqual([['session-a', 'browser', { params: { url: 'https://example.com/docs' }, revealIfOpened: false }]])
    expect(external).not.toHaveBeenCalled()

    opened.length = 0
    linkOpening = 'new-tab'
    const externalEvent = click(sessionLink('https://github.com/deepseek-ai/deepseek-harness', 'session-a'))
    listener(externalEvent)
    expect(external).toHaveBeenCalledExactlyOnceWith('https://github.com/deepseek-ai/deepseek-harness', '_blank', 'noopener,noreferrer')
    expect(opened).toEqual([])

    external.mockClear()
    linkOpening = 'sidebar'
    browser = false
    listener(click(sessionLink('https://example.com/fallback', 'session-a')))
    expect(external).toHaveBeenCalledOnce()
    expect(opened).toEqual([])

    external.mockClear()
    browser = true
    const outside = click(sessionLink('https://dshdesktop.com/zh/enterprise/', null))
    listener(outside)
    expect(outside.defaultPrevented).toBeUndefined()
    expect(outside.propagationStopped).toBeUndefined()
    expect(external).not.toHaveBeenCalled()
    expect(opened).toEqual([])

    const unnamed = click(sessionLink('https://example.com/docs', ''))
    listener(unnamed)
    expect(unnamed.defaultPrevented).toBeUndefined()
    expect(opened).toEqual([])

    listener(click(sessionLink('https://example.com/docs', 'session-a'), { metaKey: true }))
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
    expect(source).toContain('controller.openDocked=url=>ctx.sidebarRight.openTabIn(sessionId,`browser`,{params:{url},revealIfOpened:false})')
    expect(source).not.toContain('sidebarRight.openTab(`browser`')
    expect(source).not.toContain('tab.actions.openTab(`browser`')
    expect(source).toContain('window.open(externalUrl,`_blank`,`noopener,noreferrer`)')
  })
})
