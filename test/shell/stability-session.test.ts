import { EventEmitter } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPersistedGpuFallback,
  attachBackgroundClose,
  attachMainWindowRecovery,
  DesktopStability,
  handleDesktopHostFailure,
  readGpuFallbackState
} from '../../src/main/shell/stability-session'

const homes: string[] = []
afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

async function home(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-stability-'))
  homes.push(directory)
  return directory
}

function stability(userData: string, hooks: {
  stopHost?: () => Promise<void>
  releasePage?: () => Promise<void>
  showMessageBox?: (options: { message?: string; buttons?: string[] }) => Promise<{ response: number }>
  relaunch?: () => void
  quit?: () => void
  quitting?: () => boolean
} = {}): DesktopStability {
  return new DesktopStability({
    platform: 'win32',
    userData,
    quitting: hooks.quitting ?? (() => false),
    locale: () => 'zh',
    note: () => undefined,
    stopHost: hooks.stopHost ?? (async () => undefined),
    releasePage: hooks.releasePage ?? (async () => undefined),
    showMessageBox: hooks.showMessageBox ?? (async () => ({ response: 0 })),
    flushDiagnostics: async () => undefined,
    relaunch: hooks.relaunch ?? (() => undefined),
    quit: hooks.quit ?? (() => undefined),
    probePage: async () => false
  })
}

describe('desktop stability session', () => {
  it('applies a persisted software-rendering mode before Chromium boots', async () => {
    const userData = await home()
    await writeFile(join(userData, 'gpu-fallback.json'), JSON.stringify({ level: 'gpu-disabled', failures: 0, stableLaunches: 0 }))
    const switches: string[] = []
    let disabled = false
    const state = applyPersistedGpuFallback(userData, { appendSwitch: name => { switches.push(name) } }, () => { disabled = true })
    expect(state.level).toBe('gpu-disabled')
    expect(switches).toContain('disable-gpu')
    expect(disabled).toBe(true)
  })

  it('hides a Windows window that is closed without quitting, and leaves a real quit alone', async () => {
    const events = new EventEmitter()
    let hidden = false
    let quitting = false
    attachBackgroundClose({
      on: (event, listener) => { events.on(event, listener) },
      hide: () => { hidden = true }
    }, { platform: 'win32', quitting: () => quitting })
    const close = { preventDefault: vi.fn() }
    events.emit('close', close)
    expect(close.preventDefault).toHaveBeenCalledOnce()
    expect(hidden).toBe(true)
    hidden = false
    quitting = true
    const quittingClose = { preventDefault: vi.fn() }
    events.emit('close', quittingClose)
    expect(quittingClose.preventDefault).not.toHaveBeenCalled()
    expect(hidden).toBe(false)
  })

  it('asks the user to quit after the GPU process runs out of memory', async () => {
    const userData = await home()
    const order: string[] = []
    const session = stability(userData, {
      stopHost: async () => { order.push('stop') },
      releasePage: async () => { order.push('release') },
      showMessageBox: async options => {
        order.push(options.message ?? '')
        return { response: 0 }
      },
      quit: () => { order.push('quit') }
    })
    session.handleGpuProcess({ type: 'GPU', reason: 'oom', exitCode: 0 })
    await vi.waitFor(() => { expect(order).toContain('quit') })
    expect(order.slice(0, 2)).toEqual(['stop', 'release'])
    expect(order[2]).toContain('内存')
  })

  it('relaunches an unusable graphics failure into software rendering', async () => {
    const userData = await home()
    const order: string[] = []
    const session = stability(userData, {
      relaunch: () => { order.push('relaunch') },
      quit: () => { order.push('quit') }
    })
    session.handleGpuProcess({ type: 'GPU', reason: 'crashed', exitCode: 1 })
    expect(order).toEqual(['relaunch', 'quit'])
    expect(readGpuFallbackState(userData).level).toBe('gpu-disabled')
  })

  it('reloads the main document after the renderer exits', async () => {
    const userData = await home()
    const session = stability(userData)
    const contents = new EventEmitter()
    const loads: string[] = []
    const window = {
      isDestroyed: () => false,
      loadURL: (url: string) => {
        loads.push(url)
        return Promise.resolve()
      },
      webContents: Object.assign(contents, {
        isDestroyed: () => false,
        isLoading: () => false,
        isCrashed: () => false,
        stop: () => undefined,
        getURL: () => loads.at(-1) ?? '',
        getOSProcessId: () => 1
      }),
      once: () => undefined
    }
    const recovery = attachMainWindowRecovery(window, session, {
      cooldownMs: 10,
      timeoutMs: 1_000,
      onError: () => undefined,
      note: () => undefined
    })
    await recovery.navigate('dsh-app://app/')
    const prevented = { preventDefault: vi.fn() }
    contents.emit('render-process-gone', prevented, { reason: 'crashed', exitCode: 11 })
    await vi.waitFor(() => { expect(loads).toEqual(['dsh-app://app/', 'dsh-app://app/']) })
    expect(prevented.preventDefault).toHaveBeenCalledOnce()
    recovery.dispose()
    session.dispose()
  })

  it('repairs startup configuration before the plugin page, and keeps Safe Mode on the short dialog', async () => {
    const restarted: string[] = []
    const presented: unknown[] = []
    const fatals: unknown[] = []
    await handleDesktopHostFailure(new Error('host failed'), {
      quitting: () => false,
      safeMode: false,
      recoverConfiguration: async () => 'retry',
      restartHost: async () => { restarted.push('restart') },
      presentPluginRecovery: async failure => { presented.push(failure); return true },
      reportFatal: async failure => { fatals.push(failure) }
    })
    expect(restarted).toEqual(['restart'])
    expect(presented).toEqual([])
    await handleDesktopHostFailure(new Error('still failed'), {
      quitting: () => false,
      safeMode: true,
      recoverConfiguration: async () => 'continue',
      restartHost: async () => undefined,
      presentPluginRecovery: async failure => { presented.push(failure); return true },
      reportFatal: async failure => { fatals.push(failure) }
    })
    expect(presented).toEqual([])
    expect(fatals.map(failure => failure instanceof Error ? failure.message : '')).toEqual(['still failed'])
    const normal = new Error('plugin')
    await handleDesktopHostFailure(normal, {
      quitting: () => false,
      safeMode: false,
      recoverConfiguration: async () => 'continue',
      restartHost: async () => undefined,
      presentPluginRecovery: async () => false,
      reportFatal: async failure => { fatals.push(failure) }
    })
    expect(fatals[1]).toBe(normal)
  })
})
