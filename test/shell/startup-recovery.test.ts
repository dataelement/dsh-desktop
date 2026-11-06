import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }))

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
      dshHome: home,
      profile: DESKTOP_PROFILE,
      message: 'failed to import example-plugin',
      plugins: ['example-plugin'],
      launchDirectory: join(home, 'profiles', 'desktop'),
      locale: 'zh',
      theme: 'light',
      show: url => { urls.push(url) },
      nextAction: async () => {
        const next = actions.shift()
        if (next === undefined) throw new Error('unexpected extra action')
        return next
      },
      relaunch: () => { relaunched = true },
      quit: () => { throw new Error('quit was not requested') },
      openLog: () => { openedLog = true },
      isQuitting: () => false
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
})

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
