import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const clientSource = await readFile(
  path.join(projectRoot, 'packages', 'dsh-desktop-notifications', 'client.js'),
  'utf8'
)

interface Registration {
  name: string
  id?: string
  order?: number
  locale?: string
  component: (props: Record<string, unknown>) => unknown
  inject?: () => Record<string, unknown>
}

interface PreferencesFace {
  getSnapshot(): { mode: string; waiting: boolean; sound: boolean }
  subscribe(listener: () => void): () => void
  setMode(value: string): void
  setSound(value: boolean): void
  setWaiting(value: boolean): void
}

interface PolicyOptions {
  preferences: PreferencesFace
  sessions: unknown
  sessionStatus: unknown
  notify: (payload: Record<string, unknown>) => void
  isFocused: () => boolean
  translate: (key: string) => string
}

interface ClientModule {
  apply(ctx: unknown): void
  inject: string[]
  MODES: string[]
  NotificationPreferences: new () => PreferencesFace
  TurnNotificationPolicy: new (options: PolicyOptions) => { start(): { dispose(): void }; dispose(): void }
  deliverNotification(payload: Record<string, unknown>): void
}

interface Element {
  type: unknown
  props: Record<string, unknown> | null
}

const COPY: Record<string, string> = {
  'notifications.notice.title': 'DSH Desktop',
  'notifications.notice.turnBody': 'The turn is complete.',
  'notifications.notice.waitingBody': 'The turn is waiting for your answer.',
  'notifications.turnMode.title': 'Turn completion notifications',
  'notifications.turnMode.description': 'Choose when a finished turn notifies you',
  'notifications.waiting.title': 'Notify when a turn needs an answer',
  'notifications.sound.title': 'Notification sound',
  'notifications.turnMode.unfocused': 'Only when unfocused',
  'notifications.turnMode.always': 'Always',
  'notifications.turnMode.never': 'Never'
}

/** The React surface the browser half touches, shared with the VM realm. */
const React = {
  createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Element => ({
    type,
    props: { ...props, children: children.flat() }
  }),
  Fragment: Symbol('Fragment'),
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot()
}

function loadClient(options: { stored?: Record<string, string>; focused?: boolean; bridge?: unknown } = {}) {
  const stored = new Map(Object.entries(options.stored ?? {}))
  const appended: Array<{ id?: string; textContent?: string }> = []
  const removeStyle = vi.fn()
  const document = {
    hasFocus: () => options.focused ?? false,
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
    head: { appendChild: (node: { id?: string; textContent?: string }) => appended.push(node) }
  }
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, String(value)) }
  }
  const bridge = options.bridge ?? { notifyTurnComplete: vi.fn(async () => ({ ok: true })) }
  let client: ClientModule | undefined
  const window = {
    document,
    localStorage,
    dshDesktop: bridge,
    __ModuleLoader__: {
      load: (entry: { factory: (require: (id: string) => unknown) => ClientModule }) => {
        client = entry.factory((id) => {
          if (id === 'react') return React
          if (id === '@deepseek-ai/dsh-client-ui-primitives') {
            return { Switch: (props: Record<string, unknown>) => ({ type: 'Switch', props }) }
          }
          throw new Error(`Unexpected client dependency: ${id}`)
        })
      }
    }
  }
  vm.runInNewContext(clientSource, { window, document, localStorage, console })
  if (!client) throw new Error('Expected the client module to register itself')
  return { client, appended, removeStyle, stored, bridge, window }
}

/** Compose the plugin the way the module graph does, keeping every registration. */
function mountClient(options: Parameters<typeof loadClient>[0] = {}) {
  const loaded = loadClient(options)
  const registrations: Registration[] = []
  const dictionaries: Array<{ ns: string; entries: Record<string, Record<string, string>> }> = []
  const effects: Array<() => void> = []
  const ctx = {
    effect: (setup: () => (() => void) | undefined) => {
      const dispose = setup()
      if (typeof dispose === 'function') effects.push(dispose)
      return dispose
    },

    get: () => ({ sessionStatus: undefined }),
    locale: {
      register: (ns: string, entries: Record<string, Record<string, string>>) => dictionaries.push({ ns, entries }),
      bind: () => (key: string) => COPY[key] ?? key
    },
    slots: {
      inject: (_name: string, callback: () => unknown) => { callback() },
      register: (options: Registration, component: Registration['component']) => {
        registrations.push({ ...options, component })
        return () => undefined
      }
    }
  }
  loaded.client.apply(ctx)
  return { ...loaded, registrations, dictionaries, effects }
}

interface SessionRow {
  running: boolean
  displayTitle: string
  parentId?: string
  origin?: string
}

interface PendingEntry {
  running: boolean
  pendingInteraction?: { key: string }
}

/** Mutable Session list and status sources the policy subscribes to. */
function fakeSessions(rows: Record<string, SessionRow>, status: Record<string, PendingEntry> = {}) {
  const listListeners = new Set<() => void>()
  const statusListeners = new Set<() => void>()
  let byId = { ...rows }
  let snapshot = new Map(Object.entries(status).map(([id, entry]) => [id, { ...entry }]))
  return {
    sessions: {
      list: {
        getSnapshot: () => ({ byId }),
        subscribe: (listener: () => void) => {
          listListeners.add(listener)
          return () => { listListeners.delete(listener) }
        }
      }
    },
    sessionStatus: {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        statusListeners.add(listener)
        return () => { statusListeners.delete(listener) }
      }
    },
    setRunning(sessionId: string, running: boolean) {
      byId = { ...byId, [sessionId]: { ...byId[sessionId]!, running } }
      for (const listener of listListeners) listener()
    },
    setPending(sessionId: string, key: string | undefined) {
      const next = new Map(snapshot)
      const entry = { ...(next.get(sessionId) ?? { running: false }) }
      if (key === undefined) delete entry.pendingInteraction
      else entry.pendingInteraction = { key }
      next.set(sessionId, entry)
      snapshot = next
      for (const listener of statusListeners) listener()
    },
    listListenerCount: () => listListeners.size,
    statusListenerCount: () => statusListeners.size
  }
}

function preferencesFor(stored?: Record<string, string>): PreferencesFace {
  const { client } = loadClient({ stored })
  return new client.NotificationPreferences()
}

function startPolicy(options: {
  preferences?: PreferencesFace
  rows?: Record<string, SessionRow>
  status?: Record<string, PendingEntry>
  focused?: boolean
  notify?: (payload: Record<string, unknown>) => void
}) {
  const { client } = loadClient()
  const sources = fakeSessions(
    options.rows ?? { 'session-1': { running: true, displayTitle: 'Invoice review' } },
    options.status ?? {}
  )
  const notify = vi.fn(options.notify ?? (() => undefined))
  const policy = new client.TurnNotificationPolicy({
    preferences: options.preferences ?? preferencesFor(),
    sessions: sources.sessions,
    sessionStatus: sources.sessionStatus,
    notify,
    isFocused: () => options.focused ?? false,
    translate: (key: string) => COPY[key] ?? key
  }).start()
  return { policy, notify, ...sources }
}

describe('DSH Desktop notification preferences', () => {
  it('declares the services it uses and defaults to background-only turn notices', () => {
    const { client } = loadClient()
    expect(client.inject).toEqual(['slots', 'locale', 'sessions', 'uiSession'])
    expect(client.MODES).toEqual(['unfocused', 'always', 'never'])
    expect(new client.NotificationPreferences().getSnapshot()).toEqual({ mode: 'unfocused', waiting: true, sound: true })
  })

  it('registers one General Settings row that owns the preference face', () => {
    const mounted = mountClient()
    expect(mounted.registrations).toHaveLength(1)
    const [row] = mounted.registrations
    expect(row).toMatchObject({
      name: 'settings.general.item',
      id: 'desktop-notifications',
      order: 36,
      locale: 'dsh-desktop-notifications'
    })
    const injected = row?.inject?.() as { preferences: PreferencesFace }
    expect(injected.preferences.getSnapshot().mode).toBe('unfocused')
  })

  it('injects its stylesheet once and removes it with the plugin', () => {
    const mounted = mountClient()
    expect(mounted.appended).toHaveLength(1)
    expect(mounted.appended[0]?.textContent).toContain('.dshNotificationsRow')
    for (const dispose of mounted.effects.splice(0)) dispose()
    expect(mounted.removeStyle).toHaveBeenCalled()
  })

  it('keeps the zh and en dictionaries complete for every key', () => {
    const mounted = mountClient()
    const [dictionary] = mounted.dictionaries
    expect(dictionary?.ns).toBe('dsh-desktop-notifications')
    const zh = dictionary?.entries.zh ?? {}
    const en = dictionary?.entries.en ?? {}
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    expect(zh['notifications.turnMode.unfocused']).toBe('仅在未聚焦时')
    expect(zh['notifications.sound.title']).toBe('通知提示音')
    expect(en['notifications.turnMode.unfocused']).toBe('Only when unfocused')
    expect(en['notifications.sound.title']).toBe('Notification sound')
  })

  it('adopts stored choices, rejects an unknown mode, and writes every change back', () => {
    const mounted = mountClient({
      stored: {
        'dsh-desktop.turn-notification-mode': 'always',
        'dsh-desktop.notify-when-waiting': 'false',
        'dsh-desktop.notification-sound': 'false'
      }
    })
    const preferences = new mounted.client.NotificationPreferences()
    expect(preferences.getSnapshot()).toEqual({ mode: 'always', waiting: false, sound: false })

    const listener = vi.fn()
    preferences.subscribe(listener)
    preferences.setMode('never')
    preferences.setWaiting(true)
    preferences.setSound(true)
    preferences.setMode('never')
    expect(listener).toHaveBeenCalledTimes(3)
    expect(preferences.getSnapshot()).toEqual({ mode: 'never', waiting: true, sound: true })
    expect(mounted.stored.get('dsh-desktop.turn-notification-mode')).toBe('never')
    expect(mounted.stored.get('dsh-desktop.notify-when-waiting')).toBe('true')
    expect(mounted.stored.get('dsh-desktop.notification-sound')).toBe('true')

    expect(preferencesFor({ 'dsh-desktop.turn-notification-mode': 'sometimes' }).getSnapshot().mode).toBe('unfocused')
  })
})

describe('DSH Desktop turn notification policy', () => {
  it('announces one completed turn and skips child or subagent sessions', () => {
    const target = startPolicy({
      rows: {
        'session-1': { running: true, displayTitle: 'Invoice review' },
        child: { running: true, displayTitle: 'Child', parentId: 'session-1' },
        subagent: { running: true, displayTitle: 'Subagent', origin: 'subagent' }
      }
    })
    target.setRunning('session-1', false)
    target.setRunning('child', false)
    target.setRunning('subagent', false)
    expect(target.notify).toHaveBeenCalledTimes(1)
    expect(target.notify).toHaveBeenCalledWith({
      title: 'Invoice review',
      body: 'The turn is complete.',
      sound: true,
      unfocusedOnly: true
    })
    // A reconnect republishing an idle row is history, not news.
    target.setRunning('session-1', false)
    expect(target.notify).toHaveBeenCalledTimes(1)
    target.policy.dispose()
  })

  it('falls back to the product title and carries the accepted sound preference', () => {
    const preferences = preferencesFor()
    preferences.setMode('always')
    preferences.setSound(false)
    const target = startPolicy({ preferences, rows: { 'session-1': { running: true, displayTitle: '' } } })
    target.setRunning('session-1', false)
    expect(target.notify).toHaveBeenCalledWith({
      title: 'DSH Desktop',
      body: 'The turn is complete.',
      sound: false,
      unfocusedOnly: false
    })
    target.policy.dispose()
  })

  it('stays silent for a focused window unless the mode asks for every completion', () => {
    const focused = startPolicy({ focused: true })
    focused.setRunning('session-1', false)
    expect(focused.notify).not.toHaveBeenCalled()
    focused.policy.dispose()

    const always = preferencesFor()
    always.setMode('always')
    const foreground = startPolicy({ preferences: always, focused: true })
    foreground.setRunning('session-1', false)
    expect(foreground.notify).toHaveBeenCalledTimes(1)
    expect(foreground.notify.mock.calls[0]?.[0]).toMatchObject({ unfocusedOnly: false })
    foreground.policy.dispose()

    const never = preferencesFor()
    never.setMode('never')
    const muted = startPolicy({ preferences: never })
    muted.setRunning('session-1', false)
    expect(muted.notify).not.toHaveBeenCalled()
    muted.policy.dispose()
  })

  it('announces each new waiting request once, for background windows only', () => {
    const target = startPolicy({})
    target.setPending('session-1', 'approval-1')
    expect(target.notify).toHaveBeenCalledTimes(1)
    expect(target.notify.mock.calls[0]?.[0]).toMatchObject({
      body: 'The turn is waiting for your answer.',
      unfocusedOnly: true
    })
    target.setPending('session-1', 'approval-1')
    expect(target.notify).toHaveBeenCalledTimes(1)
    target.setPending('session-1', undefined)
    target.setPending('session-1', 'approval-2')
    expect(target.notify).toHaveBeenCalledTimes(2)
    target.policy.dispose()

    const disabled = preferencesFor()
    disabled.setWaiting(false)
    const silent = startPolicy({ preferences: disabled })
    silent.setPending('session-1', 'approval-1')
    expect(silent.notify).not.toHaveBeenCalled()
    silent.policy.dispose()

    const focused = startPolicy({ focused: true })
    focused.setPending('session-1', 'approval-1')
    expect(focused.notify).not.toHaveBeenCalled()
    focused.policy.dispose()
  })

  it('subscribes once to both sources, disposers released on dispose, and tolerates a failing sink', () => {
    const target = startPolicy({
      notify: () => { throw new Error('bridge rejected the notice') }
    })
    expect(target.listListenerCount()).toBe(1)
    expect(target.statusListenerCount()).toBe(1)
    expect(() => { target.setRunning('session-1', false) }).not.toThrow()
    target.policy.dispose()
    expect(target.listListenerCount()).toBe(0)
    expect(target.statusListenerCount()).toBe(0)
  })
})

describe('DSH Desktop notification delivery', () => {
  it('sends one validated payload to the shell bridge and ignores its rejection', async () => {
    const reject = vi.fn(async () => { throw new Error('shell unavailable') })
    const failing = loadClient({ bridge: { notifyTurnComplete: reject } })
    expect(() => { failing.client.deliverNotification({ title: 'A', body: 'B', sound: true, unfocusedOnly: true }) }).not.toThrow()
    await Promise.resolve()
    expect(reject).toHaveBeenCalledOnce()

    const send = vi.fn(async () => ({ ok: true }))
    const mounted = loadClient({ bridge: { notifyTurnComplete: send } })
    mounted.client.deliverNotification({ title: 'A', body: 'B', sound: false, unfocusedOnly: true })
    expect(send).toHaveBeenCalledWith({ title: 'A', body: 'B', sound: false, unfocusedOnly: true })
  })

  it('degrades to the settings alone when a plain browser has no desktop bridge', () => {
    const plain = loadClient({ bridge: undefined })
    Object.defineProperty(plain.window, 'dshDesktop', { value: undefined })
    expect(() => { plain.client.deliverNotification({ title: 'A' }) }).not.toThrow()
  })
})

describe('DSH Desktop notification rows', () => {
  it('renders the mode selector and both switches from the accepted preferences', () => {
    const mounted = mountClient()
    const row = mounted.registrations[0]
    const preferences = (row?.inject?.() as { preferences: PreferencesFace }).preferences
    const tree = row?.component({ preferences, t: (key: string) => COPY[key] ?? key }) as Element
    // Each entry is one SettingsRow element: copy on the left, its control on the right.
    const rows = tree.props?.children as Element[]
    expect(rows).toHaveLength(3)
    const rowElement = (index: number): Element => {
      const element = rows[index]!
      return (element.type as (props: Record<string, unknown>) => Element)(element.props!)
    }
    const rendered = rowElement(0)
    const [text, control] = rendered.props?.children as Element[]
    const copyLines = text?.props?.children as Element[]
    expect(copyLines[0]?.props?.children).toEqual(['Turn completion notifications'])
    expect(copyLines[1]?.props?.children).toEqual([COPY['notifications.turnMode.description']])

    const modeSelect = control
    if (!modeSelect) throw new Error('Expected the notification mode selector')
    expect(modeSelect.type).toBe('select')
    const options = modeSelect.props?.children as Element[]
    expect(options.map((option) => option.props?.value)).toEqual(['unfocused', 'always', 'never'])
    expect(options.map((option) => (option.props?.children as string[])[0])).toEqual([
      'Only when unfocused',
      'Always',
      'Never'
    ])
    expect(modeSelect.props?.['aria-label']).toBe('Turn completion notifications')
    ;(modeSelect.props?.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'always' } })
    expect(preferences.getSnapshot().mode).toBe('always')

    const waitingSwitch = (rowElement(1).props?.children as Element[])[1]!
    expect(waitingSwitch.props?.label).toBe('Notify when a turn needs an answer')
    ;(waitingSwitch.props?.onChange as (next: boolean) => void)(false)
    expect(preferences.getSnapshot().waiting).toBe(false)

    const soundSwitch = (rowElement(2).props?.children as Element[])[1]!
    expect(soundSwitch.props?.label).toBe('Notification sound')
    ;(soundSwitch.props?.onChange as (next: boolean) => void)(false)
    expect(preferences.getSnapshot().sound).toBe(false)
  })
})
