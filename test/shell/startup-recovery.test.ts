import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }))

import { listInstalledProfilePlugins } from '../../src/main/recovery/plugin-recovery'
import { DESKTOP_PROFILE } from '../../src/main/shell/safe-mode-page'
import { runStartupRecovery } from '../../src/main/shell/startup-recovery-session'
import {
  isStartupRecoveryPageUrl,
  readStartupRecoveryNavigation,
  startupRecoveryPageUrl,
  startupRecoveryTargets,
  startupRecoveryViewModel
} from '../../src/main/shell/startup-recovery'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('startup recovery page', () => {
  it('names only installed packages that appear as whole tokens', () => {
    const installed = ['example-plugin', '@scope/example', 'other-plugin']
    expect(startupRecoveryTargets('failed to import example-plugin from the profile', installed)).toEqual(['example-plugin'])
    expect(startupRecoveryTargets('example-plugin-extra failed', installed)).toEqual([])
    expect(startupRecoveryTargets('failed @scope/example', installed)).toEqual(['@scope/example'])
    expect(startupRecoveryTargets('unrelated failure', installed)).toEqual([])
  })

  it('uses an activate diagnostic to name the installed plugin and ignores a bare entry id', () => {
    const installed = ['dsh-better-sidebar', 'other-plugin']
    const message = [
      'dsh: startup failed: 1 required plugin did not activate',
      '',
      'Plugins waiting for services (1):',
      '  Plugin                     Missing services',
      '  better-sidebar (required)  webRuntime'
    ].join('\n')
    const diagnostic = [
      'Error: failed to activate loader entry better-sidebar (dsh-better-sidebar): pending (waiting for service: webRuntime)',
      '    at Entry._failure (file:///opt/app/node_modules/other-plugin/index.js:1:1)'
    ].join('\n')
    expect(startupRecoveryTargets(message, installed, diagnostic)).toEqual(['dsh-better-sidebar'])
    expect(startupRecoveryTargets(message, installed)).toEqual([])
  })

  it('keeps apply and import loader references', () => {
    const installed = ['example-plugin']
    expect(startupRecoveryTargets(
      'failed to apply loader entry sidebar (example-plugin): boom',
      installed
    )).toEqual(['example-plugin'])
    expect(startupRecoveryTargets(
      'failed to import loader entry sidebar (example-plugin): boom',
      installed
    )).toEqual(['example-plugin'])
  })

  it('does not add another installed package when the explicit reference is not installed', () => {
    const installed = ['other-plugin']
    const message = 'other-plugin failed to activate loader entry base (@deepseek-ai/dsh-base): boom'
    expect(startupRecoveryTargets(message, installed)).toEqual([])
  })

  it('accepts the existing page navigation and ignores other targets', () => {
    expect(readStartupRecoveryNavigation('dsh-recovery://auto-process')).toBe('auto-process')
    expect(readStartupRecoveryNavigation('dsh-recovery://show-log')).toBe('show-log')
    expect(readStartupRecoveryNavigation('dsh-recovery://quit')).toBe('quit')
    expect(readStartupRecoveryNavigation('dsh-recovery://upgrade?plugin=example-plugin')).toBeUndefined()
    expect(readStartupRecoveryNavigation('https://dshdesktop.com/')).toBeUndefined()
    expect(isStartupRecoveryPageUrl('dsh-desktop://desktop/plugin-recovery.html?state=%7B%7D')).toBe(true)
    expect(isStartupRecoveryPageUrl('dsh-desktop://desktop/safe-mode.html')).toBe(false)
  })

  it('keeps the repair agent, upgrades and rollback off the page', () => {
    const model = startupRecoveryViewModel({
      message: 'example-plugin failed',
      plugins: ['example-plugin'],
      launchDirectory: '/tmp/profile',
      locale: 'zh'
    })
    const url = new URL(startupRecoveryPageUrl(model, '2', 'light'))
    const state = JSON.parse(url.searchParams.get('state') ?? '{}') as {
      canRepair?: boolean
      offerRepairAgent?: boolean
      rollbackVisible?: boolean
      primaryLabel?: string
    }
    expect(url.pathname).toBe('/plugin-recovery.html')
    expect(state.canRepair).toBe(true)
    expect(state.offerRepairAgent).toBe(false)
    expect(state.rollbackVisible).toBe(false)
    expect(state.primaryLabel).toBe('停用并重启')
  })
})

describe('startup recovery session', () => {
  it('disables the named desktop plugin and relaunches, leaving the web profile alone', async () => {
    const home = join(tmpdir(), `dsh-startup-recovery-${Date.now()}`)
    temporary.push(home)
    await writeProfile(home, 'desktop', 'example-plugin')
    await writeProfile(home, 'web', 'web-plugin')
    const actions = [
      'dsh-recovery://rollback',
      'dsh-recovery://agent',
      'dsh-recovery://show-log',
      'dsh-recovery://auto-process'
    ]
    const urls: string[] = []
    let relaunched = false
    let openedLog = false
    await runStartupRecovery({
      ...sessionOptions({
        dshHome: home,
        message: 'failed to import example-plugin',
        launchDirectory: join(home, 'profiles', 'desktop'),
        show: url => { urls.push(url); return true },
        bindRound: deliverQueued(actions),
        relaunch: () => { relaunched = true },
        quit: () => { throw new Error('quit was not requested') },
        openLog: () => { openedLog = true }
      })
    })
    expect(relaunched).toBe(true)
    expect(openedLog).toBe(true)
    expect(actions).toEqual([])
    expect(urls).toHaveLength(4)
    expect(new URL(urls[1] ?? '').searchParams.get('state')).toContain('应用版本回退还在更新卡片')
    expect(new URL(urls[2] ?? '').searchParams.get('state')).toContain('修复代理要等应用重新启动后')
    const desktopState = await readFile(join(home, 'profiles', 'desktop', '.dsh-market', 'state.json'), 'utf8')
    expect(desktopState).toContain('example-plugin')
    await expect(readFile(join(home, 'profiles', 'web', '.dsh-market', 'state.json'), 'utf8')).rejects.toThrow()
  })

  it('keeps an action that arrives before the page finishes opening', async () => {
    let quit = 0
    let deliver: ((url: string) => void) | undefined
    await runStartupRecovery({
      ...sessionOptions({
        show: async () => {
          deliver?.('dsh-recovery://quit')
          return true
        },
        bindRound: next => {
          deliver = next
          return () => { if (deliver === next) deliver = undefined }
        },
        quit: () => { quit += 1 }
      })
    })
    expect(quit).toBe(1)
    expect(deliver).toBeUndefined()
  })

  it('cancels the wait when the recovery page does not open', async () => {
    let quit = 0
    let cleaned = false
    await expect(runStartupRecovery({
      ...sessionOptions({
        show: () => false,
        bindRound: deliver => {
          deliver('dsh-recovery://quit')
          return () => { cleaned = true }
        },
        quit: () => { quit += 1 }
      })
    })).rejects.toThrow('The startup recovery page did not open')
    expect(cleaned).toBe(true)
    expect(quit).toBe(0)
  })

  it('cancels the wait when loading the recovery page rejects', async () => {
    let cleaned = false
    await expect(runStartupRecovery({
      ...sessionOptions({
        show: () => Promise.reject(new Error('load failed')),
        bindRound: () => () => { cleaned = true }
      })
    })).rejects.toThrow('load failed')
    expect(cleaned).toBe(true)
  })

  it('ends the wait when the window closes after the page is open', async () => {
    let relaunched = false
    let cleaned = false
    await runStartupRecovery({
      ...sessionOptions({
        show: () => true,
        bindRound: (_deliver, cancel) => {
          queueMicrotask(() => { cancel() })
          return () => { cleaned = true }
        },
        relaunch: () => { relaunched = true }
      })
    })
    expect(relaunched).toBe(false)
    expect(cleaned).toBe(true)
  })

  it('cancels the wait on shutdown without raising a presentation failure', async () => {
    let quitting = false
    let cleaned = false
    await runStartupRecovery({
      ...sessionOptions({
        show: () => true,
        bindRound: (_deliver, cancel) => {
          queueMicrotask(() => {
            quitting = true
            cancel()
          })
          return () => { cleaned = true }
        },
        isQuitting: () => quitting
      })
    })
    expect(cleaned).toBe(true)
  })

  it('does not raise a failure when shutdown closes the page while it is loading', async () => {
    let quitting = false
    let cleaned = false
    await runStartupRecovery({
      ...sessionOptions({
        show: () => { quitting = true; return false },
        bindRound: () => () => { cleaned = true },
        isQuitting: () => quitting
      })
    })
    expect(cleaned).toBe(true)
  })

  it('runs the first action once', async () => {
    let quit = 0
    let shows = 0
    await runStartupRecovery({
      ...sessionOptions({
        show: async () => {
          shows += 1
          return true
        },
        bindRound: deliver => {
          queueMicrotask(() => {
            deliver('dsh-recovery://quit')
            deliver('dsh-recovery://auto-process')
          })
          return () => undefined
        },
        quit: () => { quit += 1 },
        relaunch: () => { throw new Error('duplicate action relaunched') }
      })
    })
    expect(shows).toBe(1)
    expect(quit).toBe(1)
  })

  it('lets a later round survive cleanup from the previous round', async () => {
    const actions = ['dsh-recovery://show-log', 'dsh-recovery://quit']
    let current: ((url: string) => void) | undefined
    const listeners = new Set<() => void>()
    let previous: (() => void) | undefined
    let openedLog = false
    let quit = 0
    await runStartupRecovery({
      ...sessionOptions({
        show: () => true,
        bindRound: deliver => {
          current = deliver
          const stop = (): void => undefined
          listeners.add(stop)
          const cleanup = (): void => {
            if (current === deliver) current = undefined
            listeners.delete(stop)
          }
          const stale = previous
          previous = cleanup
          stale?.()
          queueMicrotask(() => {
            const action = actions.shift()
            if (current === deliver && action !== undefined) deliver(action)
          })
          return cleanup
        },
        openLog: () => { openedLog = true },
        quit: () => { quit += 1 }
      })
    })
    expect(openedLog).toBe(true)
    expect(quit).toBe(1)
    expect(actions).toEqual([])
    expect(current).toBeUndefined()
    expect(listeners.size).toBe(0)
  })

  it('opens the recovery page for the installed plugin named by a host diagnostic', async () => {
    const home = join(tmpdir(), `dsh-startup-evidence-${Date.now()}`)
    temporary.push(home)
    await writeProfile(home, 'desktop', 'dsh-better-sidebar')
    const installed = await listInstalledProfilePlugins(home, DESKTOP_PROFILE)
    const message = [
      'dsh: startup failed: 1 required plugin did not activate',
      'Plugins waiting for services (1):',
      '  better-sidebar (required)  webRuntime'
    ].join('\n')
    const diagnostic = 'failed to activate loader entry better-sidebar (dsh-better-sidebar): pending (waiting for service: webRuntime)'
    const plugins = startupRecoveryTargets(message, installed, diagnostic)
    expect(plugins).toEqual(['dsh-better-sidebar'])
    const urls: string[] = []
    await runStartupRecovery({
      ...sessionOptions({
        dshHome: home,
        plugins,
        message,
        launchDirectory: join(home, 'profiles', 'desktop'),
        show: url => { urls.push(url); return true },
        bindRound: deliverQueued(['dsh-recovery://quit'])
      })
    })
    const state = new URL(urls[0] ?? '').searchParams.get('state') ?? ''
    expect(state).toContain('dsh-better-sidebar')
    expect(state).toContain('停用并重启')
  })
})

function deliverQueued(actions: string[]): Parameters<typeof runStartupRecovery>[0]['bindRound'] {
  return deliver => {
    queueMicrotask(() => {
      const next = actions.shift()
      if (next !== undefined) deliver(next)
    })
    return () => undefined
  }
}

function sessionOptions(overrides: Partial<Parameters<typeof runStartupRecovery>[0]> = {}): Parameters<typeof runStartupRecovery>[0] {
  return {
    dshHome: '/tmp/dsh-home',
    profile: DESKTOP_PROFILE,
    message: 'example-plugin failed',
    plugins: ['example-plugin'],
    launchDirectory: '/tmp/dsh-home/profiles/desktop',
    locale: 'zh',
    theme: 'light',
    show: () => true,
    bindRound: deliver => {
      queueMicrotask(() => { deliver('dsh-recovery://quit') })
      return () => undefined
    },
    relaunch: () => undefined,
    quit: () => undefined,
    openLog: () => undefined,
    isQuitting: () => false,
    ...overrides
  }
}

async function writeProfile(home: string, profile: string, plugin: string): Promise<void> {
  const directory = join(home, 'profiles', profile)
  await mkdir(join(directory, 'node_modules', plugin), { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({
    dependencies: { [plugin]: '1.0.0' },
    dsh: { profile: { bundles: [plugin] } }
  }))
  await writeFile(join(directory, 'node_modules', plugin, 'package.json'), JSON.stringify({
    name: plugin,
    version: '1.0.0'
  }))
}
