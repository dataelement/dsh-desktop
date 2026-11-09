import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EventEmitter } from 'node:events'
import type { MessageBoxOptions, OpenDialogOptions } from 'electron'
import type { HarnessLocale } from '../application-locale'
import { shouldKeepRunningInBackground } from '../close-to-tray'
import { loadDesktopWindowAfterStop } from '../desktop-window-load'
import {
  defaultGpuFallbackState,
  gpuFallbackStateEquals,
  gpuFallbackSwitches,
  hasExhaustedGpuRecovery,
  isGpuLossFatal,
  isRendererGpuFallbackCandidate,
  parseGpuFallbackState,
  planGpuFallbackResponse,
  planStableLaunch,
  serializeGpuFallbackState,
  type GpuFallbackState
} from '../gpu-fallback'
import { RendererNavigationRecovery } from '../main-window-recovery'
import { ProcessRecovery } from '../process-recovery'
import { rendererDiagnosticText } from '../renderer-diagnostics'
import { isMemoryExit } from '../resource-diagnostics'
import { recoverStartupConfiguration } from '../startup-config-recovery'
import { requestWindowRestart } from '../window-restart-prompt'
import { SCHEME } from './window/ipc'

const GPU_STABLE_LAUNCH_DELAY_MS = 60_000

interface GpuCommandLine {
  appendSwitch(name: string): void
}

/** Apply the graphics mode recorded by a previous launch. This has to run before Chromium boots. */
export function applyPersistedGpuFallback(
  userData: string,
  commandLine: GpuCommandLine,
  disableHardwareAcceleration: () => void
): GpuFallbackState {
  const state = readGpuFallbackState(userData)
  for (const name of gpuFallbackSwitches(state.level)) commandLine.appendSwitch(name)
  if (state.level === 'gpu-disabled') disableHardwareAcceleration()
  return state
}

export function readGpuFallbackState(userData: string): GpuFallbackState {
  try {
    return parseGpuFallbackState(readFileSync(join(userData, 'gpu-fallback.json'), 'utf8'))
  } catch {
    return defaultGpuFallbackState
  }
}

export function writeGpuFallbackState(userData: string, state: GpuFallbackState): void {
  try {
    writeFileSync(join(userData, 'gpu-fallback.json'), serializeGpuFallbackState(state))
  } catch {
    // The next launch rediscovers a mode this one could not persist.
  }
}

interface CloseTarget {
  on(event: 'close', listener: (event: { preventDefault(): void }) => void): void
  hide(): void
}

/** Windows keeps the process alive when the user closes the window without quitting. */
export function attachBackgroundClose(
  window: CloseTarget,
  options: { platform: NodeJS.Platform; quitting: () => boolean; onClose?: () => void; onHidden?: () => void }
): void {
  window.on('close', event => {
    options.onClose?.()
    if (!shouldKeepRunningInBackground(options.platform, options.quitting())) return
    event.preventDefault()
    window.hide()
    options.onHidden?.()
  })
}

interface RecoveryContents {
  isDestroyed(): boolean
  isLoading(): boolean
  isCrashed(): boolean
  stop(): void
  getURL(): string
  getOSProcessId(): number
  once(event: 'did-stop-loading' | 'destroyed', listener: () => void): void
  removeListener(event: 'did-stop-loading' | 'destroyed', listener: () => void): void
  on(event: 'render-process-gone', listener: (event: { preventDefault(): void }, details: { reason: string; exitCode: number }) => void): void
  on(event: 'did-fail-load', listener: (event: unknown, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => void): void
  on(event: 'unresponsive' | 'responsive' | 'did-finish-load', listener: () => void): void
}

interface RecoveryWindow {
  isDestroyed(): boolean
  loadURL(url: string): Promise<void>
  webContents: RecoveryContents
  once(event: 'closed', listener: () => void): void
}

export interface PageRecovery {
  navigate(url: string): Promise<boolean>
  dispose(): void
}

interface PageRecoveryOptions {
  cooldownMs?: number
  timeoutMs?: number
  healthyMs?: number
  onError: (error: unknown) => void
  note: (line: string) => void
}

/**
 * Retries a lost main-document navigation. Memory loss and an exhausted graphics
 * fallback go to the process dialog instead of reloading a blank window.
 */
export function attachMainWindowRecovery(
  window: RecoveryWindow,
  stability: DesktopStability,
  options: PageRecoveryOptions
): PageRecovery {
  const contents = window.webContents
  const recovery = new RendererNavigationRecovery({
    load: (url, cancelled) => loadDesktopWindowAfterStop(window, url, cancelled),
    cancelled: () => stability.blocksNavigation() || stability.isQuitting() || window.isDestroyed() || contents.isDestroyed(),
    onError: options.onError,
    onDiagnostic: diagnostic => {
      options.note(`[desktop] renderer recovery: ${diagnostic.phase} reload=${String(diagnostic.reloadCount)}`)
    },
    ...(options.cooldownMs === undefined ? {} : { cooldownMs: options.cooldownMs }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.healthyMs === undefined ? {} : { healthyMs: options.healthyMs })
  })
  window.once('closed', () => { recovery.dispose() })
  contents.on('did-finish-load', () => {
    if (window.isDestroyed() || contents.isDestroyed()) return
    let url = ''
    try { url = contents.getURL() } catch { return }
    if (url.startsWith(`${SCHEME}://`)) stability.markHarnessRendered()
  })
  contents.on('render-process-gone', (event, details) => {
    if (stability.isQuitting() || window.isDestroyed() || details.reason === 'clean-exit') return
    if (stability.processRecovery.blocked && !isMemoryExit(details.reason, details.exitCode)) return
    event.preventDefault()
    options.note(`[desktop] main window render-process-gone: reason=${details.reason} exitCode=${String(details.exitCode)}`)
    if (isMemoryExit(details.reason, details.exitCode)) {
      stability.processRecovery.start('memory')
      return
    }
    const unusableLaunch = !stability.harnessRendered || recovery.reloadCount > 0
    if (
      isRendererGpuFallbackCandidate({ platform: stability.platform, reason: details.reason, exitCode: details.exitCode }) &&
      stability.respondToGpuFallback(
        `renderer native crash: reason=${details.reason} exitCode=${String(details.exitCode)}`,
        { unusableLaunch }
      )
    ) return
    let currentUrl = ''
    try { currentUrl = contents.getURL() } catch { currentUrl = '' }
    recovery.rendererGone(currentUrl, { reason: details.reason, exitCode: details.exitCode })
  })
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || stability.processRecovery.blocked || stability.isQuitting() || window.isDestroyed()) return
    options.note(`[desktop] main window did-fail-load: errorCode=${String(errorCode)} description=${rendererDiagnosticText(errorDescription)}`)
    let currentUrl = ''
    try { currentUrl = contents.getURL() } catch { currentUrl = '' }
    recovery.loadFailed(validatedURL, errorCode, currentUrl)
  })
  contents.on('unresponsive', () => {
    options.note('[desktop] main window webContents became unresponsive')
  })
  contents.on('responsive', () => {
    options.note('[desktop] main window webContents became responsive again')
  })
  return {
    navigate: url => recovery.navigate(url),
    dispose: () => { recovery.dispose() }
  }
}

export interface DesktopStabilityOptions {
  platform: NodeJS.Platform
  userData: string
  quitting: () => boolean
  locale: () => HarnessLocale
  note: (line: string) => void
  stopHost: () => Promise<void>
  releasePage: () => Promise<void>
  showMessageBox: (options: MessageBoxOptions) => Promise<{ response: number }>
  flushDiagnostics: () => Promise<void>
  relaunch: () => void
  quit: () => void
  probePage: () => Promise<boolean>
}

/** Process recovery, graphics fallback, and the native startup-configuration dialog. */
export class DesktopStability {
  readonly processRecovery: ProcessRecovery
  readonly platform: NodeJS.Platform
  private gpuFallbackState: GpuFallbackState
  private gpuFallbackRelaunching = false
  private harnessRenderedFlag = false
  private gpuStableLaunchTimer: ReturnType<typeof setTimeout> | undefined
  private configurationRecovery: Promise<'retry' | 'continue'> | undefined

  constructor(private readonly options: DesktopStabilityOptions) {
    this.platform = options.platform
    this.gpuFallbackState = readGpuFallbackState(options.userData)
    this.processRecovery = new ProcessRecovery({
      cancelled: () => options.quitting() || this.gpuFallbackRelaunching,
      probe: () => options.probePage(),
      note: message => { options.note(`[desktop] ${message}`) },
      stop: () => options.stopHost(),
      releasePage: () => options.releasePage(),
      prompt: kind => requestWindowRestart({
        locale: options.locale(),
        cancelled: () => options.quitting() || this.gpuFallbackRelaunching,
        flushDiagnostics: () => options.flushDiagnostics(),
        show: box => options.showMessageBox(box),
        note: line => { options.note(line) }
      }, kind),
      restart: software => {
        this.gpuFallbackRelaunching = true
        if (software) this.persistGpuFallback({ level: 'gpu-disabled', failures: 0, stableLaunches: 0 })
        options.relaunch()
      },
      quit: () => { options.quit() },
      onError: failure => {
        options.note(`[desktop] native recovery failed: ${rendererDiagnosticText(failure instanceof Error ? failure.message : String(failure))}`)
      }
    })
  }

  get harnessRendered(): boolean { return this.harnessRenderedFlag }

  isQuitting(): boolean { return this.options.quitting() || this.gpuFallbackRelaunching }

  blocksNavigation(): boolean { return this.processRecovery.blocked }

  attachProcessWatch(app: EventEmitter): void {
    this.processRecovery.attach(app)
  }

  /** One native dialog at a time. A repair asks the caller to start Host again. */
  recoverStartupConfiguration(input: {
    dshHome: string
    profile: string
    environment: NodeJS.ProcessEnv
    launchDirectory?: string
    showOpenDialog: (options: OpenDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>
    reveal: (path: string) => void
  }): Promise<'retry' | 'continue'> {
    this.configurationRecovery ??= recoverStartupConfiguration({
      dshHome: input.dshHome,
      profile: input.profile,
      environment: input.environment,
      ...(input.launchDirectory === undefined ? {} : { launchDirectory: input.launchDirectory }),
      chinese: this.options.locale() === 'zh',
      cancelled: () => this.isQuitting(),
      stop: () => this.options.stopHost(),
      show: options => this.options.showMessageBox(options),
      selectFile: options => input.showOpenDialog(options),
      reveal: path => { input.reveal(path) },
      note: line => { this.options.note(line) }
    }).finally(() => { this.configurationRecovery = undefined })
    return this.configurationRecovery
  }

  handleGpuProcess(details: { type: string; reason: string; exitCode: number }): void {
    if (details.type !== 'GPU') return
    if (this.gpuFallbackRelaunching || this.options.quitting()) return
    if (this.processRecovery.blocked && !isMemoryExit(details.reason, details.exitCode)) return
    if (!isGpuLossFatal(details.reason, details.exitCode, { platform: this.platform, context: this.processRecovery.exitContext })) {
      if (details.reason === 'crashed' && details.exitCode === 34) {
        this.processRecovery.recordGpuLoss()
        this.options.note(`[desktop] GPU process device-loss self-recovery: reason=${details.reason} exitCode=${String(details.exitCode)}`)
      }
      return
    }
    if (isMemoryExit(details.reason, details.exitCode)) {
      this.processRecovery.start('memory')
      return
    }
    this.respondToGpuFallback(`GPU process gone: reason=${details.reason} exitCode=${String(details.exitCode)}`)
  }

  /**
   * A launch that never showed the app page relaunches into the next graphics mode.
   * A repeated failure after software rendering opens the graphics dialog instead.
   */
  respondToGpuFallback(details: string, response: { unusableLaunch?: boolean } = {}): boolean {
    if (this.processRecovery.blocked || this.gpuFallbackRelaunching || this.options.quitting()) return false
    if (this.gpuStableLaunchTimer !== undefined) {
      clearTimeout(this.gpuStableLaunchTimer)
      this.gpuStableLaunchTimer = undefined
    }
    const unusable = response.unusableLaunch === true || !this.harnessRenderedFlag
    this.options.note(`[desktop] ${details} fallback=${this.gpuFallbackState.level} failures=${String(this.gpuFallbackState.failures)}`)
    const plan = planGpuFallbackResponse({
      state: this.gpuFallbackState,
      harnessRendered: !unusable
    })
    const escalated = plan.state.level !== this.gpuFallbackState.level
    if (!gpuFallbackStateEquals(plan.state, this.gpuFallbackState)) this.persistGpuFallback(plan.state)
    if (escalated) this.options.note(`[desktop] GPU fallback raised to ${plan.state.level}`)
    if (!plan.relaunch) {
      if (hasExhaustedGpuRecovery(this.gpuFallbackState, unusable)) {
        this.processRecovery.start('graphics')
        return true
      }
      return false
    }
    this.gpuFallbackRelaunching = true
    this.options.relaunch()
    this.options.quit()
    return true
  }

  markHarnessRendered(): void {
    if (this.harnessRenderedFlag) return
    this.harnessRenderedFlag = true
    if (this.gpuFallbackState.level === 'default' && this.gpuFallbackState.stableLaunches === 0) return
    this.gpuStableLaunchTimer = setTimeout(() => {
      this.gpuStableLaunchTimer = undefined
      const next = planStableLaunch(this.gpuFallbackState)
      if (gpuFallbackStateEquals(next, this.gpuFallbackState)) return
      if (next.level !== this.gpuFallbackState.level) {
        this.options.note(`[desktop] GPU fallback lowered to ${next.level} after ${String(this.gpuFallbackState.stableLaunches + 1)} stable launches`)
      }
      this.persistGpuFallback(next)
    }, GPU_STABLE_LAUNCH_DELAY_MS)
    this.gpuStableLaunchTimer.unref?.()
  }

  dispose(): void {
    if (this.gpuStableLaunchTimer !== undefined) clearTimeout(this.gpuStableLaunchTimer)
    this.gpuStableLaunchTimer = undefined
    this.processRecovery.dispose()
  }

  private persistGpuFallback(state: GpuFallbackState): void {
    this.gpuFallbackState = state
    writeGpuFallbackState(this.options.userData, state)
  }
}

export interface HostFailureActions {
  quitting: () => boolean
  safeMode: boolean
  recoverConfiguration: () => Promise<'retry' | 'continue'>
  restartHost: () => Promise<void>
  presentPluginRecovery: (failure: unknown) => Promise<boolean>
  reportFatal: (failure: unknown) => Promise<void>
}

/**
 * A repairable startup file is offered before the plugin page or the short fatal dialog.
 * Safe Mode has no plugin page, so a declined repair still uses the short dialog.
 */
export async function handleDesktopHostFailure(failure: unknown, actions: HostFailureActions): Promise<void> {
  if (actions.quitting()) return
  const outcome = await actions.recoverConfiguration()
  if (actions.quitting()) return
  if (outcome === 'retry') {
    // A failed restart publishes another host failure. The caller queues that
    // attempt; reporting it here would open a second dialog.
    await actions.restartHost()
    return
  }
  if (actions.safeMode) {
    await actions.reportFatal(failure)
    return
  }
  const presented = await actions.presentPluginRecovery(failure)
  if (!presented && !actions.quitting()) await actions.reportFatal(failure)
}
