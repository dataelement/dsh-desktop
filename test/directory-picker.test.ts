import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

describe('desktop Electron directory picker', () => {
  it('exposes a narrow preload bridge and handles it in the main process', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(preload).toContain("contextBridge.exposeInMainWorld('dshDesktopDirectoryPicker'")
    expect(preload).toContain("ipcRenderer.invoke('directory-picker:open')")
    expect(main).toContain("ipcMain.handle('directory-picker:open'")
    expect(main).toContain('event.senderFrame !== mainWindow.webContents.mainFrame')
    expect(main).toContain('dialog.showOpenDialog(mainWindow')
    expect(main).toContain("properties: ['openDirectory']")
    expect(main).toContain("app.commandLine.appendSwitch('lang', harnessLocale() === 'zh' ? 'zh-CN' : 'en-US')")
  })

  it('keeps native Chinese resources for both macOS and Windows locale names', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      build?: { electronLanguages?: string[] }
    }

    expect(packageJson.build?.electronLanguages).toEqual(
      expect.arrayContaining(['zh-CN', 'zh_CN', 'zh-TW', 'zh_TW'])
    )
  })

  it('keeps the stock picker composition: the seam comes from the stock auto row', async () => {
    const desktopPatch = await readFile('build/dsh-desktop.patch.yml', 'utf8')

    // No picker rows at all - the stock auto row mounts the native backend.
    expect(desktopPatch).not.toMatch(/id:\s*directory-picker/)
    expect(desktopPatch).not.toContain('dsh-client-ui-directory-picker-native')
  })

  it('captures the client bridge as a reproducible dependency patch', async () => {
    const dependencyPatch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-directory-picker-native'),
      'utf8'
    )

    expect(dependencyPatch).toContain('window.dshDesktopDirectoryPicker')
    expect(dependencyPatch).toContain('DSH Desktop directory picker bridge is unavailable')
  })

  it('leaves a missing picker service to Harness rather than patching around it', async () => {
    // The desktop used to patch dsh-host-apiproxy so a missing directoryPicker
    // degraded instead of taking the whole proxy down: ApiProxy reached
    // ctx.directoryPicker directly, which throws when nothing composed it.
    //
    // 0.1.2-alpha.1 solved that structurally. The picker methods moved into
    // their own service in dsh-api-workspace-controller, declared with
    // `static inject = ["directoryPicker"]`, so Cordis simply leaves that
    // controller unmounted when no backend is composed — the rest of the Host
    // API is unaffected. Patching it would now be re-implementing upstream.
    const controller = await readFile(
      new URL(
        '../node_modules/@deepseek-ai/dsh-api-workspace-controller/lib/index.js',
        import.meta.url
      ),
      'utf8'
    )

    expect(controller).toContain('static inject = ["directoryPicker"]')
    expect(controller).toContain('"directoryPickerController"')
  })
})
