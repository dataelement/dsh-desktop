import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DesktopBackendController, type DesktopBackendState } from '../../src/main/shell/backend/backend-controller'
import type { DesktopProductRuntime } from '../../src/main/shell/product-runtime'

const context = { userDataPath: '/temporary/desktop', dshHome: '/temporary/desktop/harness', safeMode: false, version: '1.0.0' }
const loadProduct = () => import('../../src/main/shell/product-runtime')
type ProductManager = Awaited<ReturnType<typeof loadProduct>>

beforeEach(() => { vi.resetModules() })

function deferred<T>() {
  let resolve = (_value: T): void => { throw new Error('Deferred is not ready') }
  const promise = new Promise<T>(onResolve => { resolve = onResolve })
  return { promise, resolve }
}

function product() {
  return {
    hostEnvironment: vi.fn((): NodeJS.ProcessEnv => ({ PRODUCT_ENDPOINT: 'first' })),
    attachWindow: vi.fn<DesktopProductRuntime['attachWindow']>(),
    dispose: vi.fn(async () => {})
  }
}

function backend(manager: ProductManager) {
  const states: DesktopBackendState[] = []
  const makeHost = () => ({
    environment: manager.readDesktopProductEnvironment(),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {})
  })
  const hosts: ReturnType<typeof makeHost>[] = []
  const createHost = vi.fn(() => {
    const host = makeHost()
    hosts.push(host)
    return host
  })
  const controller = new DesktopBackendController(createHost, state => { states.push(state) })
  const prepare = vi.fn(async () => { await manager.startDesktopProduct(context) })
  return { controller, prepare, createHost, hosts, states }
}

describe('desktop product preparation with backend controller', () => {
  it('does not create Host until product initialization resolves and reads its actual environment', async () => {
    const manager = await loadProduct()
    const initialized = deferred<DesktopProductRuntime>()
    const entered = deferred<void>()
    const instance = product()
    const factory = vi.fn(() => {
      entered.resolve()
      return initialized.promise
    })
    manager.registerDesktopProduct(factory)
    const run = backend(manager)
    const starting = run.controller.start(run.prepare)
    await entered.promise
    expect(run.createHost).not.toHaveBeenCalled()
    expect(instance.hostEnvironment).not.toHaveBeenCalled()
    expect(run.controller.state.phase).toBe('starting')

    instance.hostEnvironment.mockReturnValue({ PRODUCT_ENDPOINT: 'resolved-endpoint' })
    initialized.resolve(instance)
    await starting
    expect(run.createHost).toHaveBeenCalledTimes(1)
    expect(run.hosts[0]?.environment).toEqual({ PRODUCT_ENDPOINT: 'resolved-endpoint' })
    expect(run.hosts[0]?.start).toHaveBeenCalledTimes(1)
    expect(instance.hostEnvironment).toHaveBeenCalledTimes(1)
    expect(run.controller.state.phase).toBe('ready')
    await run.controller.close()
    await manager.disposeDesktopProduct()
  })

  it('reports product startup failure and retries preparation successfully before creating Host', async () => {
    const manager = await loadProduct()
    const instance = product()
    const failure = new Error('product initialization failed')
    const factory = vi.fn<() => Promise<DesktopProductRuntime>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue(instance)
    manager.registerDesktopProduct(factory)
    const run = backend(manager)

    await expect(run.controller.start(run.prepare)).rejects.toBe(failure)
    expect(run.controller.state).toMatchObject({ phase: 'error', failure })
    expect(run.createHost).not.toHaveBeenCalled()
    expect(instance.hostEnvironment).not.toHaveBeenCalled()
    await run.controller.start(run.prepare)
    expect(factory).toHaveBeenCalledTimes(2)
    expect(run.prepare).toHaveBeenCalledTimes(2)
    expect(run.createHost).toHaveBeenCalledTimes(1)
    expect(run.hosts[0]?.environment).toEqual({ PRODUCT_ENDPOINT: 'first' })
    expect(run.states.map(state => state.phase)).toEqual(['starting', 'error', 'starting', 'ready'])
    await run.controller.close()
    await manager.disposeDesktopProduct()
  })

  it('reads fresh environment on Host restart while initializing the product only once', async () => {
    const manager = await loadProduct()
    const instance = product()
    const factory = vi.fn(() => instance)
    manager.registerDesktopProduct(factory)
    const run = backend(manager)
    await run.controller.start(run.prepare)
    expect(run.hosts[0]?.environment).toEqual({ PRODUCT_ENDPOINT: 'first' })
    await run.controller.stop()
    expect(run.hosts[0]?.stop).toHaveBeenCalledTimes(1)
    expect(instance.dispose).not.toHaveBeenCalled()

    instance.hostEnvironment.mockReturnValue({ PRODUCT_ENDPOINT: 'replacement' })
    await run.controller.start(run.prepare)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(run.prepare).toHaveBeenCalledTimes(2)
    expect(instance.hostEnvironment).toHaveBeenCalledTimes(2)
    expect(run.createHost).toHaveBeenCalledTimes(2)
    expect(run.hosts[1]?.environment).toEqual({ PRODUCT_ENDPOINT: 'replacement' })
    expect(run.hosts[0]?.environment).toEqual({ PRODUCT_ENDPOINT: 'first' })
    expect(run.hosts[1]?.start).toHaveBeenCalledTimes(1)
    expect(run.controller.host).toBe(run.hosts[1])
    await run.controller.close()
    await manager.disposeDesktopProduct()
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  })

  it('does not create Host after close during initialization and waits to release the late runtime', async () => {
    const manager = await loadProduct()
    const initialized = deferred<DesktopProductRuntime>()
    const entered = deferred<void>()
    const cleanup = deferred<void>()
    const disposing = deferred<void>()
    const instance = product()
    instance.dispose.mockImplementation(() => {
      disposing.resolve()
      return cleanup.promise
    })
    manager.registerDesktopProduct(() => {
      entered.resolve()
      return initialized.promise
    })
    const run = backend(manager)
    const starting = run.controller.start(run.prepare)
    await entered.promise
    const closing = run.controller.close()
    const stopped = manager.disposeDesktopProduct()
    let released = false
    void stopped.then(() => { released = true })
    expect(run.createHost).not.toHaveBeenCalled()

    initialized.resolve(instance)
    await Promise.all([starting, closing, disposing.promise])
    expect(run.createHost).not.toHaveBeenCalled()
    expect(run.controller.host).toBeUndefined()
    expect(run.states.map(state => state.phase)).toEqual(['starting'])
    expect(instance.hostEnvironment).not.toHaveBeenCalled()
    expect(instance.dispose).toHaveBeenCalledTimes(1)
    expect(released).toBe(false)
    cleanup.resolve()
    await stopped
    expect(released).toBe(true)
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    await expect(run.controller.start(run.prepare)).rejects.toThrow('desktop backend is closed')
    expect(run.createHost).not.toHaveBeenCalled()
  })
})
