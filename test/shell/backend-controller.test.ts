import { describe, expect, it } from 'vitest'
import { DesktopBackendController, type DesktopBackendHost, type DesktopBackendState } from '../../src/main/shell/backend/backend-controller'

describe('desktop backend controller', () => {
  it('starts one host and publishes ready', async () => {
    const host = new FakeHost()
    const states: DesktopBackendState['phase'][] = []
    let prepared = false
    const controller = new DesktopBackendController(() => host, state => { states.push(state.phase) })
    await controller.start(async () => { prepared = true })
    expect(prepared).toBe(true)
    expect(host.started).toBe(1)
    expect(controller.state.phase).toBe('ready')
    expect(controller.host).toBe(host)
    expect(states).toEqual(['starting', 'ready'])
  })

  it('shares one attempt across concurrent starts and ignores a later start while ready', async () => {
    const host = new FakeHost()
    host.hold()
    const controller = new DesktopBackendController(() => host, () => {})
    const first = controller.start(async () => {})
    const second = controller.start(async () => {})
    host.release()
    await Promise.all([first, second])
    await controller.start(async () => {})
    expect(host.started).toBe(1)
  })

  it('stops the child and rejects another start until stop finishes', async () => {
    const host = new FakeHost()
    host.hold()
    const controller = new DesktopBackendController(() => host, () => {})
    const starting = controller.start(async () => {})
    await new Promise(resolve => { setImmediate(resolve) })
    expect(host.started).toBe(1)
    const stopped = controller.stop()
    await expect(controller.start(async () => {})).rejects.toThrow('desktop backend is stopping')
    host.release()
    await stopped
    await expect(starting).resolves.toBeUndefined()
    expect(host.stopped).toBe(1)
    expect(controller.host).toBeUndefined()
  })

  it('publishes the original failure after the host was ready', async () => {
    const host = new FakeHost()
    let fail: (error: Error) => void = () => {}
    const states: DesktopBackendState[] = []
    const controller = new DesktopBackendController(onFailure => {
      fail = onFailure
      return host
    }, state => { states.push(state) })
    await controller.start(async () => {})
    const failure = new Error('host down')
    fail(failure)
    expect(controller.state).toEqual({ phase: 'error', message: 'host down', failure })
    expect(controller.host).toBeUndefined()
    expect(states.at(-1)?.phase).toBe('error')
  })

  it('rejects start after close', async () => {
    const controller = new DesktopBackendController(() => new FakeHost(), () => {})
    await controller.close()
    await expect(controller.start(async () => {})).rejects.toThrow('desktop backend is closed')
  })
})

class FakeHost implements DesktopBackendHost {
  started = 0
  stopped = 0
  private releaseStart: () => void = () => {}
  private gate: Promise<void> = Promise.resolve()

  hold(): void {
    this.gate = new Promise(resolve => { this.releaseStart = resolve })
  }

  start(): Promise<void> {
    this.started += 1
    return this.gate
  }

  release(): void {
    this.releaseStart()
  }

  stop(): Promise<void> {
    this.stopped += 1
    return Promise.resolve()
  }
}
