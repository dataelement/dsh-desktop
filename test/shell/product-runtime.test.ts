import type { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DesktopProductRuntime, DesktopProductServices } from '../../src/main/shell/product-runtime'

const context = { userDataPath: '/temporary/desktop', dshHome: '/temporary/desktop/harness', safeMode: false, version: '1.0.0' }
// The manager only forwards window identity; these tests never call Electron APIs.
const window = {} as BrowserWindow
const services: DesktopProductServices = {
  checkForUpdates: async () => {},
  showLogs: async () => {},
  restartInSafeMode: () => {}
}

beforeEach(() => { vi.resetModules() })

function product() {
  return {
    hostEnvironment: vi.fn((): NodeJS.ProcessEnv => ({ PRODUCT_ENDPOINT: 'http://127.0.0.1:4000' })),
    attachWindow: vi.fn<DesktopProductRuntime['attachWindow']>(),
    dispose: vi.fn(async () => {})
  }
}

function deferred<T>() {
  let resolve = (_value: T): void => { throw new Error('Deferred is not ready') }
  let reject = (_error: unknown): void => { throw new Error('Deferred is not ready') }
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const load = () => import('../../src/main/shell/product-runtime')

describe('desktop product lifecycle', () => {
  it('defaults to no behavior without registration', async () => {
    const manager = await load()
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    await manager.startDesktopProduct(context)
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    await manager.disposeDesktopProduct()
    await manager.disposeDesktopProduct()
  })

  it('allows registration once and locks it before the first attempt finishes', async () => {
    const manager = await load()
    const instance = product()
    const pending = deferred<DesktopProductRuntime>()
    manager.registerDesktopProduct(() => pending.promise)
    expect(() => manager.registerDesktopProduct(() => instance)).toThrow('registered once')
    const starting = manager.startDesktopProduct(context)
    expect(() => manager.registerDesktopProduct(() => instance)).toThrow('before startup')
    pending.resolve(instance)
    await starting
    expect(() => manager.registerDesktopProduct(() => instance)).toThrow('before startup')
    await manager.disposeDesktopProduct()
  })

  it('locks out late registration even after an unconfigured start', async () => {
    const manager = await load()
    await manager.startDesktopProduct(context)
    expect(() => manager.registerDesktopProduct(() => product())).toThrow('before startup')
    await manager.disposeDesktopProduct()
  })

  it('deduplicates initialization and snapshots the first context', async () => {
    const manager = await load()
    const instance = product()
    const pending = deferred<DesktopProductRuntime>()
    const factory = vi.fn(() => pending.promise)
    manager.registerDesktopProduct(factory)
    const input = { ...context }
    const first = manager.startDesktopProduct(input)
    input.version = 'changed'
    const second = manager.startDesktopProduct({ ...context, safeMode: true })
    expect(second).toBe(first)
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    await Promise.resolve()
    expect(factory).toHaveBeenCalledExactlyOnceWith(context)
    pending.resolve(instance)
    await first
    expect(instance.attachWindow).not.toHaveBeenCalled()
    expect(manager.startDesktopProduct(context)).toBe(first)
    expect(factory).toHaveBeenCalledTimes(1)
    manager.attachDesktopProductWindow(window, services)
    expect(instance.attachWindow).toHaveBeenCalledExactlyOnceWith(window, services)
    await manager.disposeDesktopProduct()
  })

  it.each(['throw', 'reject'])('retries a factory after a %s without replacing registration', async failure => {
    const manager = await load()
    const instance = product()
    const error = new Error('initialization failed')
    const factory = vi.fn((): DesktopProductRuntime | Promise<DesktopProductRuntime> => {
      if (factory.mock.calls.length === 1) {
        if (failure === 'throw') throw error
        return Promise.reject(error)
      }
      return instance
    })
    manager.registerDesktopProduct(factory)
    await expect(manager.startDesktopProduct(context)).rejects.toBe(error)
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    expect(instance.attachWindow).not.toHaveBeenCalled()
    expect(() => manager.registerDesktopProduct(() => instance)).toThrow('before startup')
    await manager.startDesktopProduct({ ...context, safeMode: true })
    expect(factory).toHaveBeenLastCalledWith({ ...context, safeMode: true })
    expect(factory).toHaveBeenCalledTimes(2)
    expect(manager.readDesktopProductEnvironment()).toEqual(instance.hostEnvironment())
    await manager.disposeDesktopProduct()
  })

  it('reads current environment on every Host launch and returns an isolated copy', async () => {
    const manager = await load()
    const instance = product()
    const environment: NodeJS.ProcessEnv = { PRODUCT_ENDPOINT: 'first', PRODUCT_TOKEN: 'private-fixture' }
    instance.hostEnvironment.mockImplementation(() => environment)
    const inherited = { ...process.env }
    manager.registerDesktopProduct(() => instance)
    await manager.startDesktopProduct(context)
    const first = manager.readDesktopProductEnvironment()
    first.PRODUCT_ENDPOINT = 'caller change'
    expect(environment.PRODUCT_ENDPOINT).toBe('first')
    environment.PRODUCT_ENDPOINT = 'second'
    expect(manager.readDesktopProductEnvironment()).toEqual({ PRODUCT_ENDPOINT: 'second', PRODUCT_TOKEN: 'private-fixture' })
    expect(instance.hostEnvironment).toHaveBeenCalledTimes(2)
    expect(process.env).toEqual(inherited)
    await manager.disposeDesktopProduct()
  })

  it('waits for late initialization and its disposal without exposing it during shutdown', async () => {
    const manager = await load()
    const instance = product()
    const pending = deferred<DesktopProductRuntime>()
    const cleanup = deferred<void>()
    instance.dispose.mockImplementation(() => cleanup.promise)
    manager.registerDesktopProduct(() => pending.promise)
    const starting = manager.startDesktopProduct(context)
    await Promise.resolve()
    const stopping = manager.disposeDesktopProduct()
    expect(manager.disposeDesktopProduct()).toBe(stopping)
    let stopped = false
    void stopping.then(() => { stopped = true })
    await Promise.resolve()
    expect(stopped).toBe(false)
    pending.resolve(instance)
    await starting
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    expect(instance.attachWindow).not.toHaveBeenCalled()
    await expect(manager.startDesktopProduct(context)).rejects.toThrow('shutting down')
    expect(stopped).toBe(false)
    cleanup.resolve()
    await stopping
    expect(instance.dispose).toHaveBeenCalledTimes(1)
    expect(instance.hostEnvironment).not.toHaveBeenCalled()
    expect(manager.readDesktopProductEnvironment()).toEqual({})
  })

  it('releases an already initialized instance exactly once and blocks use immediately', async () => {
    const manager = await load()
    const instance = product()
    manager.registerDesktopProduct(() => instance)
    await manager.startDesktopProduct(context)
    const stopping = manager.disposeDesktopProduct()
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    expect(instance.attachWindow).not.toHaveBeenCalled()
    await stopping
    await manager.disposeDesktopProduct()
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  })

  it('finishes shutdown when the in-flight factory rejects and leaves startup error with its caller', async () => {
    const manager = await load()
    const pending = deferred<DesktopProductRuntime>()
    manager.registerDesktopProduct(() => pending.promise)
    const starting = manager.startDesktopProduct(context)
    const failed = expect(starting).rejects.toThrow('initialization failed')
    const stopping = manager.disposeDesktopProduct()
    pending.reject(new Error('initialization failed'))
    await failed
    await stopping
    await expect(manager.startDesktopProduct(context)).rejects.toThrow('shutting down')
  })

  it('treats disposal before startup as terminal', async () => {
    const manager = await load()
    await manager.disposeDesktopProduct()
    expect(() => manager.registerDesktopProduct(() => product())).toThrow('before startup')
    await expect(manager.startDesktopProduct(context)).rejects.toThrow('shutting down')
  })

  it('propagates runtime errors without retaining a disposed instance', async () => {
    const manager = await load()
    const instance = product()
    const error = new Error('product failed')
    instance.hostEnvironment.mockImplementation(() => { throw error })
    instance.attachWindow.mockImplementation(() => { throw error })
    instance.dispose.mockRejectedValue(error)
    manager.registerDesktopProduct(() => instance)
    await manager.startDesktopProduct(context)
    expect(() => manager.readDesktopProductEnvironment()).toThrow(error)
    expect(() => manager.attachDesktopProductWindow(window, services)).toThrow(error)
    const stopping = manager.disposeDesktopProduct()
    await expect(stopping).rejects.toBe(error)
    expect(manager.disposeDesktopProduct()).toBe(stopping)
    expect(manager.readDesktopProductEnvironment()).toEqual({})
    manager.attachDesktopProductWindow(window, services)
    expect(instance.attachWindow).toHaveBeenCalledTimes(1)
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  })
})
