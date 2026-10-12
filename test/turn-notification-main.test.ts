import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TurnNotificationHandle, TurnNotificationPlatform } from '../src/main/turn-notification'

const native = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')
  const notices: Array<{ options: unknown; closed: boolean }> = []
  class Notice extends EventEmitter {
    static isSupported = vi.fn(() => true)
    show = vi.fn()
    close = vi.fn()
    constructor(options: unknown) {
      super()
      notices.push({ options, closed: false })
    }
  }
  return { notices, Notice }
})

vi.mock('electron', () => ({ Notification: native.Notice }))

const { DesktopTurnNotification } = await import('../src/main/turn-notification')

interface Recorded {
  options: { title: string; body: string; silent: boolean }
  closed: boolean
  clicks: Array<() => void>
  released: number
}

/** Scripted native platform: the default Electron one stays untouched. */
function platform(options: { supported?: boolean; showFails?: boolean; releaseFails?: boolean } = {}) {
  const notices: Recorded[] = []
  return {
    notices,
    supported: vi.fn(() => options.supported ?? true),
    show(input: { title: string; body: string; silent: boolean }): TurnNotificationHandle {
      if (options.showFails === true) throw new Error('notification centre unavailable')
      const record: Recorded = { options: input, closed: false, clicks: [], released: 0 }
      notices.push(record)
      return {
        close: () => { record.closed = true },
        onClick: (listener) => {
          record.clicks.push(listener)
          return () => {
            record.released += 1
            if (options.releaseFails === true) throw new Error('listener already released')
          }
        }
      }
    }
  } as TurnNotificationPlatform & { notices: Recorded[] }
}

function setup(options: Parameters<typeof platform>[0] = {}, locale: 'en' | 'zh' = 'zh') {
  const bridge = platform(options)
  let focused = false
  const activate = vi.fn()
  const warn = vi.fn()
  const notifier = new DesktopTurnNotification({
    isFocused: () => focused,
    activate,
    locale: () => locale,
    platform: bridge,
    warn
  })
  return {
    notifier,
    bridge,
    activate,
    warn,
    setFocus: (next: boolean) => { focused = next },
    click: (index = 0) => { bridge.notices[index]?.clicks[0]?.() }
  }
}

const payload = { title: 'Invoice review', body: '轮次已完成。', sound: true, unfocusedOnly: true }

afterEach(() => {
  vi.clearAllMocks()
  native.notices.length = 0
  native.Notice.isSupported.mockReturnValue(true)
})

describe('desktop turn notification', () => {
  it('presents one background notice with the requested sound and returns to the app on click', () => {
    const f = setup()
    expect(f.notifier.present(payload)).toEqual({ ok: true })
    expect(f.bridge.notices).toHaveLength(1)
    expect(f.bridge.notices[0]?.options).toEqual({
      title: 'Invoice review',
      body: '轮次已完成。',
      silent: false
    })
    f.click()
    expect(f.activate).toHaveBeenCalledOnce()
    expect(f.bridge.notices[0]?.closed).toBe(true)
    expect(f.bridge.notices[0]?.released).toBe(1)
    // A retired click cannot activate the application a second time.
    f.click()
    expect(f.activate).toHaveBeenCalledOnce()
  })

  it('suppresses background-only notices while the window has focus', () => {
    const f = setup()
    f.setFocus(true)
    expect(f.notifier.present(payload)).toEqual({ ok: false })
    expect(f.bridge.notices).toHaveLength(0)
    // The always mode asks for a notice even in the foreground.
    expect(f.notifier.present({ ...payload, unfocusedOnly: false })).toEqual({ ok: true })
    expect(f.bridge.notices).toHaveLength(1)
  })

  it('treats the renderer payload as untrusted presentation input', () => {
    const f = setup()
    expect(f.notifier.present(undefined)).toEqual({ ok: false })
    expect(f.notifier.present('a notice')).toEqual({ ok: false })
    expect(f.notifier.present(null)).toEqual({ ok: false })
    expect(f.bridge.notices).toHaveLength(0)

    // Missing, empty, and oversized copy falls back to the shell dictionary.
    f.notifier.present({})
    expect(f.bridge.notices[0]?.options).toEqual({
      title: 'DSH Desktop',
      body: '轮次已完成。',
      silent: true
    })
    f.notifier.present({ title: '   ', body: 'x'.repeat(400), sound: 'yes' })
    expect(f.bridge.notices[1]?.options).toEqual({
      title: 'DSH Desktop',
      body: '轮次已完成。',
      silent: true
    })
    // Accepted copy is trimmed, and a non-boolean sound never enables the sound.
    f.notifier.present({ title: '  Trimmed  ', body: 'Done', sound: 1 })
    expect(f.bridge.notices[2]?.options).toEqual({ title: 'Trimmed', body: 'Done', silent: true })
  })

  it('localizes its fallback copy from the shell locale', () => {
    const f = setup({}, 'en')
    f.notifier.present({})
    expect(f.bridge.notices[0]?.options).toEqual({
      title: 'DSH Desktop',
      body: 'The turn is complete.',
      silent: true
    })
  })

  it('replaces the previous notice and releases its listener', () => {
    const f = setup()
    f.notifier.present({ ...payload, title: 'first' })
    f.notifier.present({ ...payload, title: 'second' })
    expect(f.bridge.notices).toHaveLength(2)
    expect(f.bridge.notices[0]?.closed).toBe(true)
    expect(f.bridge.notices[0]?.released).toBe(1)
    f.click(0)
    expect(f.activate).not.toHaveBeenCalled()
    f.click(1)
    expect(f.activate).toHaveBeenCalledOnce()
  })

  it('presents nothing when the environment cannot show notifications', () => {
    const f = setup({ supported: false })
    expect(f.notifier.present(payload)).toEqual({ ok: false })
    expect(f.bridge.notices).toHaveLength(0)
  })

  it('reports a failing platform instead of taking the main process down', () => {
    const f = setup({ showFails: true })
    expect(f.notifier.present(payload)).toEqual({ ok: false })
    expect(f.warn).toHaveBeenCalledWith(expect.stringContaining('turn notification failed'))
  })

  it('keeps failing release and close calls from escaping clear()', () => {
    const f = setup({ releaseFails: true })
    f.notifier.present(payload)
    expect(() => { f.notifier.clear() }).not.toThrow()
    expect(f.bridge.notices[0]?.closed).toBe(true)
    expect(f.warn).toHaveBeenCalledWith(expect.stringContaining('listener release failed'))
    f.notifier.clear()
    expect(f.warn).toHaveBeenCalledTimes(1)
  })

  it('uses the real Electron notification centre by default', () => {
    const notifier = new DesktopTurnNotification({
      isFocused: () => false,
      activate: vi.fn(),
      locale: () => 'zh'
    })
    notifier.present({ title: 'Session', body: 'Done', sound: false, unfocusedOnly: true })
    expect(native.notices).toHaveLength(1)
    const [notice] = native.notices
    expect(notice?.options).toEqual({ title: 'Session', body: 'Done', silent: true })
    const instance = native.Notice as unknown as { isSupported: ReturnType<typeof vi.fn> }
    instance.isSupported.mockReturnValue(false)
    expect(notifier.present(payload)).toEqual({ ok: false })
    expect(native.notices).toHaveLength(1)
  })
})
