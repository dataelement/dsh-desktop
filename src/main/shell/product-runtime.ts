import type { BrowserWindow } from 'electron'

export interface DesktopProductContext {
  userDataPath: string
  dshHome: string
  safeMode: boolean
  version: string
}

export interface DesktopProductServices {
  checkForUpdates(): Promise<void>
  showLogs(): Promise<void>
  restartInSafeMode(): void
}

export interface DesktopProductRuntime {
  /** Called before every Host launch; return only this product's environment overrides. */
  hostEnvironment(): NodeJS.ProcessEnv
  attachWindow(window: BrowserWindow, services: DesktopProductServices): void
  dispose(): Promise<void>
}

/** A rejected factory must release any resources it allocated before rejecting. */
export type DesktopProductFactory = (context: DesktopProductContext) => DesktopProductRuntime | Promise<DesktopProductRuntime>

let factory: DesktopProductFactory | undefined
let started = false
let closing = false
let runtime: DesktopProductRuntime | undefined
let starting: Promise<void> | undefined
let stopping: Promise<void> | undefined

/** Register once, before the first start attempt (including an unconfigured start). */
export function registerDesktopProduct(productFactory: DesktopProductFactory): void {
  if (factory || started || closing) {
    throw new Error('Desktop product must be registered once before startup')
  }
  factory = productFactory
}

/**
 * Concurrent calls and later Host restarts share one initialization. A failed
 * attempt may be retried with the registered factory and a new context.
 * Await this before launching Host or attaching a window. During shutdown this
 * may resolve without publishing a usable runtime; shutdown owns its disposal.
 */
export function startDesktopProduct(context: DesktopProductContext): Promise<void> {
  if (closing) return Promise.reject(new Error('Desktop product is shutting down'))
  started = true
  if (starting) return starting
  const snapshot = { ...context }
  starting = Promise.resolve().then(() => factory?.(snapshot)).then(product => {
    runtime = product
  }, (error: unknown) => {
    starting = undefined
    throw error
  })
  return starting
}

/** Read fresh overrides for each Host launch without changing process.env. */
export function readDesktopProductEnvironment(): NodeJS.ProcessEnv {
  return closing || !runtime ? {} : { ...runtime.hostEnvironment() }
}

/** Unready or closing products are skipped; calls are not queued for later. */
export function attachDesktopProductWindow(window: BrowserWindow, services: DesktopProductServices): void {
  if (!closing) runtime?.attachWindow(window, services)
}

/**
 * Terminal, idempotent shutdown: prevent new use immediately, then await any
 * initialization and release its result once. Disposal errors reach the caller.
 */
export function disposeDesktopProduct(): Promise<void> {
  if (stopping) return stopping
  closing = true
  stopping = Promise.resolve().then(async () => {
    // Initialization errors belong to start's caller. A rejected factory has no
    // returned runtime to dispose and must clean up its own partial resources.
    await starting?.then(() => undefined, () => undefined)
    const product = runtime
    runtime = undefined
    await product?.dispose()
  })
  return stopping
}
