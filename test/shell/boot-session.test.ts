import { describe, expect, it } from 'vitest'
import { DesktopBackendController, type DesktopBackendHost } from '../../src/main/shell/backend/backend-controller'
import { DesktopBootSession, retainDesktopBoot, type DesktopBootReady } from '../../src/main/shell/backend/boot-session'
import { dispatchAppDocument } from '../../src/main/shell/window/web-document'

describe('desktop boot session', () => {
  it('returns the ready generation and drops it when that start is no longer ready', async () => {
    const session = new DesktopBootSession()
    const first = session.suspend()
    session.publish(first, bootReady('4010', ['first']))
    await expect(session.readBoot()).resolves.toEqual({
      injections: ['first'],
      streamBaseUrl: 'http://127.0.0.1:4010'
    })

    const second = session.suspend()
    expect(session.ready).toBeUndefined()
    session.publish(first, bootReady('4010', ['first']))
    await expect(session.readBoot()).rejects.toThrow('Desktop Host is unavailable')
    const withheld = await dispatchAppDocument(new Request('dsh-app://app/api/session'), session.documentTarget('/unused'))
    expect(withheld.status).toBe(503)

    session.publish(second, bootReady('4011', ['second']))
    await expect(session.readBoot()).resolves.toEqual({
      injections: ['second'],
      streamBaseUrl: 'http://127.0.0.1:4011'
    })
  })

  it('waits for the replacement Host and does not answer with the previous injections', async () => {
    const session = new DesktopBootSession()
    const host = new ScriptedHost(session)
    const controller = controllerFor(session, host)
    host.push(bootReady('4010', ['first']))
    await startAndTrack(session, controller)
    await expect(session.readBoot()).resolves.toMatchObject({ injections: ['first'] })

    host.fail(new Error('host down'))
    await expect(session.readBoot()).rejects.toThrow('Desktop Host is unavailable')
    const withheld = await dispatchAppDocument(new Request('dsh-app://app/api/session'), session.documentTarget('/unused'))
    expect(withheld.status).toBe(503)

    host.hold()
    host.push(bootReady('4011', ['second']))
    const replacement = startAndTrack(session, controller)
    let settled = false
    const pending = session.readBoot().then(value => {
      settled = true
      return value
    }, (error: unknown) => {
      settled = true
      throw error
    })
    await new Promise(resolve => { setImmediate(resolve) })
    expect(settled).toBe(false)
    expect(session.ready).toBeUndefined()
    host.release()
    await expect(pending).resolves.toEqual({
      injections: ['second'],
      streamBaseUrl: 'http://127.0.0.1:4011'
    })
    await replacement
  })

  it('drops a boot payload from an attempt that fails before it becomes ready', async () => {
    const session = new DesktopBootSession()
    const host = new ScriptedHost(session)
    const controller = controllerFor(session, host)
    host.hold()
    host.push(bootReady('4010', ['late']))
    const starting = startAndTrack(session, controller)
    await new Promise(resolve => { setImmediate(resolve) })
    host.fail(new Error('host down'))
    host.release()
    await expect(starting).rejects.toThrow('host down')
    await expect(session.readBoot()).rejects.toThrow('host down')
    expect(session.ready).toBeUndefined()
  })
})

function bootReady(port: string, injections: readonly string[]): DesktopBootReady {
  return {
    url: `http://127.0.0.1:${port}/boot?generation=${injections[0] ?? 'empty'}`,
    injections,
    cookie: 'dsh=session'
  }
}

function controllerFor(session: DesktopBootSession, host: ScriptedHost): DesktopBackendController<ScriptedHost> {
  session.suspend()
  return new DesktopBackendController(onFailure => {
    host.fail = onFailure
    return host
  }, state => { retainDesktopBoot(session, state.phase) })
}

function startAndTrack(session: DesktopBootSession, controller: DesktopBackendController<ScriptedHost>): Promise<void> {
  const starting = controller.start(async () => {})
  session.track(starting)
  return starting
}

class ScriptedHost implements DesktopBackendHost {
  fail: (error: Error) => void = () => {}
  private readonly queue: DesktopBootReady[] = []
  private releaseStart: (() => void) | undefined
  private gate: Promise<void> = Promise.resolve()

  constructor(private readonly session: DesktopBootSession) {}

  push(ready: DesktopBootReady): void {
    this.queue.push(ready)
  }

  hold(): void {
    this.gate = new Promise(resolve => { this.releaseStart = resolve })
  }

  release(): void {
    const release = this.releaseStart
    this.releaseStart = undefined
    this.gate = Promise.resolve()
    release?.()
  }

  async start(): Promise<void> {
    const generation = this.session.capture()
    await this.gate
    const ready = this.queue.shift()
    if (ready === undefined) throw new Error('missing boot generation')
    this.session.publish(generation, ready)
  }

  stop(): Promise<void> {
    return Promise.resolve()
  }
}
