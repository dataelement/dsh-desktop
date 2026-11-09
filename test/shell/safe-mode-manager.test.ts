import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }))

import { runSafeModeManager } from '../../src/main/shell/safe-mode-manager'
import { DESKTOP_PROFILE, readSafeModeManagerAction, safeModePageUrl } from '../../src/main/shell/safe-mode-page'
import { buildSafeModeViewModel } from '../../src/main/safe-mode'
import { profileDirectoryName, profilePackageJsonPath } from '../../src/main/recovery/plugin-recovery'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('safe mode page actions', () => {
  it('accepts disable, enable, restart and quit, and rejects other payloads', () => {
    expect(readSafeModeManagerAction('apply', { plugins: ['example-plugin'] })).toEqual({
      type: 'apply',
      plugins: ['example-plugin']
    })
    expect(readSafeModeManagerAction('enable', { plugins: ['@scope/example-plugin'] })?.type).toBe('enable')
    expect(readSafeModeManagerAction('restart', undefined)).toEqual({ type: 'restart' })
    expect(readSafeModeManagerAction('quit', {})).toEqual({ type: 'quit' })
    expect(readSafeModeManagerAction('agent', { prompt: '请先说明结论。' })).toEqual({
      type: 'agent',
      prompt: '请先说明结论。'
    })
    expect(readSafeModeManagerAction('agent', { prompt: '' })).toBeUndefined()
    expect(readSafeModeManagerAction('upgrade', { plugins: ['example-plugin'] })).toEqual({
      type: 'upgrade',
      plugins: ['example-plugin']
    })
    expect(readSafeModeManagerAction('recovery-open', undefined)).toEqual({ type: 'recovery-open' })
    expect(readSafeModeManagerAction('backup-restore', { removalId: 'removal-1' })).toEqual({
      type: 'backup-restore',
      removalId: 'removal-1'
    })
    expect(readSafeModeManagerAction('backup-delete', { removalId: '../backup' })).toBeUndefined()
    expect(readSafeModeManagerAction('apply', { plugins: ['../example-plugin'] })).toBeUndefined()
    expect(readSafeModeManagerAction('apply', { plugins: [] })).toBeUndefined()
    expect(readSafeModeManagerAction('apply', { plugins: ['example-plugin', 'example-plugin'] })).toBeUndefined()
  })

  it('frames the existing page on the desktop scheme', () => {
    const model = buildSafeModeViewModel({ locale: 'zh', plugins: ['example-plugin'] })
    const url = new URL(safeModePageUrl(model, '3', 'dark'))
    expect(url.href.startsWith('dsh-desktop://desktop/safe-mode.html')).toBe(true)
    expect(url.searchParams.get('seq')).toBe('3')
    expect(url.searchParams.get('theme')).toBe('dark')
    expect(url.searchParams.get('state')).toContain('example-plugin')
  })

  it('keeps the default profile on web and names desktop explicitly', () => {
    expect(profileDirectoryName()).toBe('web')
    expect(profilePackageJsonPath('/dsh')).toBe(join('/dsh', 'profiles', 'web', 'package.json'))
    expect(profilePackageJsonPath('/dsh', DESKTOP_PROFILE)).toBe(join('/dsh', 'profiles', 'desktop', 'package.json'))
    expect(() => profilePackageJsonPath('/dsh', '..')).toThrow('Invalid profile name')
    expect(() => profilePackageJsonPath('/dsh', 'desktop/../web')).toThrow('Invalid profile name')
  })
})

describe('safe mode manager', () => {
  it('disables and re-enables a plugin in the desktop profile, then exits', async () => {
    const home = join(tmpdir(), `dsh-safe-manager-${Date.now()}`)
    temporary.push(home)
    await writeProfile(home, 'desktop', 'example-plugin')
    await writeProfile(home, 'web', 'web-plugin')
    const actions = [
      { action: 'apply', selection: { plugins: ['example-plugin'] } },
      { action: 'enable', selection: { plugins: ['example-plugin'] } },
      { action: 'agent', selection: { prompt: 'repair' } },
      { action: 'restart', selection: {} }
    ]
    const urls: string[] = []
    let exited = false
    await runSafeModeManager({
      dshHome: home,
      profile: DESKTOP_PROFILE,
      locale: 'zh',
      theme: 'light',
      show: url => { urls.push(url) },
      nextAction: async () => {
        const next = actions.shift()
        if (next === undefined) throw new Error('unexpected extra action')
        return next
      },
      quit: () => { throw new Error('quit was not requested') },
      exitSafeMode: () => { exited = true },
      isQuitting: () => false
    })
    expect(exited).toBe(true)
    expect(actions).toEqual([])
    expect(urls).toHaveLength(4)
    const first = new URL(urls[0] ?? '').searchParams.get('state')
    const last = new URL(urls[3] ?? '').searchParams.get('state')
    expect(first).toContain('example-plugin')
    expect(last).toContain('智能修复代理还没有接上')
    const desktopState = JSON.parse(await readFile(join(home, 'profiles', 'desktop', '.dsh-market', 'state.json'), 'utf8')) as { disabled?: unknown }
    expect(desktopState.disabled).toEqual([])
    await expect(readFile(join(home, 'profiles', 'web', '.dsh-market', 'state.json'), 'utf8')).rejects.toThrow()
  })

  it('steps aside after the repair agent opens and stays when it fails', async () => {
    const home = join(tmpdir(), `dsh-safe-agent-${Date.now()}`)
    temporary.push(home)
    await writeProfile(home, 'desktop', 'example-plugin')
    const prompts: Array<string | undefined> = []
    const urls: string[] = []
    await runSafeModeManager({
      dshHome: home,
      profile: DESKTOP_PROFILE,
      locale: 'zh',
      theme: 'light',
      show: url => { urls.push(url) },
      nextAction: async () => ({ action: 'agent', selection: { prompt: '请先说明结论。' } }),
      quit: () => { throw new Error('quit was not requested') },
      exitSafeMode: () => { throw new Error('exit was not requested') },
      openAgent: async prompt => {
        prompts.push(prompt)
        return { ok: true }
      },
      isQuitting: () => false
    })
    expect(prompts).toEqual(['请先说明结论。'])
    expect(urls).toHaveLength(1)

    const failed = [...urls]
    await runSafeModeManager({
      dshHome: home,
      profile: DESKTOP_PROFILE,
      locale: 'zh',
      theme: 'light',
      show: url => { failed.push(url) },
      nextAction: async () => {
        if (failed.length > 2) return { action: 'quit', selection: {} }
        return { action: 'agent', selection: { prompt: '再试一次。' } }
      },
      quit: () => {},
      exitSafeMode: () => { throw new Error('exit was not requested') },
      openAgent: async () => ({ ok: false, error: '维修核心服务尚未就绪。' }),
      isQuitting: () => false
    })
    expect(new URL(failed[2] ?? '').searchParams.get('state')).toContain('维修核心服务尚未就绪。')
  })

  it('upgrades named plugins and restores a backup through the supplied handlers', async () => {
    const home = join(tmpdir(), `dsh-safe-maintain-${Date.now()}`)
    temporary.push(home)
    await writeProfile(home, 'desktop', 'example-plugin')
    const upgraded: string[][] = []
    const restored: string[] = []
    const urls: string[] = []
    const actions = [
      { action: 'upgrade', selection: { plugins: ['example-plugin'] } },
      { action: 'backup-restore', selection: { removalId: 'removal-1' } },
      { action: 'quit', selection: {} }
    ]
    await runSafeModeManager({
      dshHome: home,
      profile: DESKTOP_PROFILE,
      locale: 'zh',
      theme: 'light',
      show: url => { urls.push(url) },
      nextAction: async () => {
        const next = actions.shift()
        if (next === undefined) throw new Error('unexpected extra action')
        return next
      },
      quit: () => {},
      exitSafeMode: () => { throw new Error('exit was not requested') },
      loadHealthReports: async () => [{
        packageName: 'example-plugin',
        healthStatus: 'upgrade-available',
        healthLabel: '可升级',
        upgradeReady: true,
        upgradeVersion: '2.0.0'
      }],
      upgradePlugins: async plugins => {
        upgraded.push([...plugins])
        return { ok: true, notice: '成功升级 1 个插件。' }
      },
      restoreBackup: async removalId => {
        restored.push(removalId)
        return { ok: true, notice: '已恢复 example-plugin。' }
      },
      isQuitting: () => false
    })
    expect(upgraded).toEqual([['example-plugin']])
    expect(restored).toEqual(['removal-1'])
    expect(new URL(urls[1] ?? '').searchParams.get('state')).toContain('成功升级 1 个插件。')
    expect(new URL(urls[2] ?? '').searchParams.get('state')).toContain('已恢复 example-plugin。')
    expect(new URL(urls[0] ?? '').searchParams.get('state')).toContain('upgradeButtonLabel')
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
