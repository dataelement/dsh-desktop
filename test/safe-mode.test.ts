import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildSafeModeViewModel, shouldStartInSafeMode } from '../src/main/safe-mode'

describe('Safe Mode', () => {
  it('is opt-in through an exact command-line switch', () => {
    expect(shouldStartInSafeMode(['DSH Desktop', '--safe-mode'])).toBe(true)
    expect(shouldStartInSafeMode(['DSH Desktop', '--safe-mode=false'])).toBe(false)
  })

  it('explains that plugins are blocked before offering removal', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', '@example/plugin-b', 'plugin-a']
    })
    expect(model.badge).toBe('安全模式')
    expect(model.heading).toContain('插件已被屏蔽')
    expect(model.summary).toContain('Harness 当前没有启动')
    expect(model.plugins).toEqual(['plugin-a', '@example/plugin-b'])
    expect(model.safetyNote).toContain('未选中的插件不会被删除')
  })

  it('ships a selectable management page with no remote content', async () => {
    const html = await readFile('build/safe-mode.html', 'utf8')
    expect(html).toContain('id="plugins"')
    expect(html).toContain('type = \'checkbox\'')
    expect(html).toContain("window.dshSafeMode.action('uninstall', plugins)")
    expect(html).toContain("default-src 'none'")
    expect(html).not.toContain('http://')
    expect(html).not.toContain('https://')
  })

  it('wires Safe Mode into startup, IPC, and the packaged resources', async () => {
    const [main, preload, manifest] = await Promise.all([
      readFile('src/main/index.ts', 'utf8'),
      readFile('src/preload/index.ts', 'utf8'),
      readFile('package.json', 'utf8')
    ])
    expect(main).toContain('shouldStartInSafeMode(process.argv)')
    expect(main).toContain("await runtime.stop()")
    expect(main).toContain("ipcMain.handle('safe-mode:action'")
    expect(preload).toContain("ipcRenderer.invoke('safe-mode:action', action, plugins)")
    expect(JSON.parse(manifest).build.extraResources).toContainEqual({
      from: 'build/safe-mode.html',
      to: 'safe-mode.html'
    })
  })
})
