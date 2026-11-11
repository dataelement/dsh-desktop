import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ENTERPRISE_URL, aboutMenuLabel, aboutUsesPage, buildDarwinDesktopMenu, buildWindowsApplicationMenu, enterpriseMenuLabel, externalUrlToOpen, insertFileMenu, safeModeMenuLabel, shortcutFileMenuLabels, standardMenuLabels, updateMenuLabel } from '../../src/main/shell/enterprise-menu'

describe('enterprise entry', () => {
  it('uses the product enterprise page for both languages', () => {
    expect(enterpriseMenuLabel('zh-CN')).toBe('了解企业版')
    expect(enterpriseMenuLabel('en-US')).toBe('Explore Enterprise')
    expect(updateMenuLabel('zh-CN')).toBe('检查更新…')
    expect(updateMenuLabel('en-US')).toBe('Check for Updates…')
    expect(aboutMenuLabel('zh-CN')).toBe('关于 DSH Desktop')
    expect(aboutMenuLabel('en-US')).toBe('About DSH Desktop')
    expect(safeModeMenuLabel('zh-CN')).toBe('以安全模式重启…')
    expect(safeModeMenuLabel('en-US')).toBe('Restart as Safe Mode…')
    expect(aboutUsesPage('dsh-app://app/', 'dsh-app')).toBe(true)
    expect(aboutUsesPage('dsh-app://app/index.html', 'dsh-app')).toBe(true)
    expect(aboutUsesPage('file:///tmp/splash.html', 'dsh-app')).toBe(false)
    expect(externalUrlToOpen(ENTERPRISE_URL)).toBe(ENTERPRISE_URL)
    expect(externalUrlToOpen('javascript:alert(1)')).toBeUndefined()
    expect(externalUrlToOpen('not a url')).toBeUndefined()
  })

  it.each(['zh-CN', 'en-US'])('orders about, updates, then enterprise in the %s app menu', locale => {
    const openEnterprise = vi.fn()
    const showAbout = vi.fn()
    const checkForUpdates = vi.fn()
    const restart = vi.fn()
    const restartSafeMode = vi.fn()
    const hide = vi.fn()
    const hideOthers = vi.fn()
    const unhideAll = vi.fn()
    const quit = vi.fn()
    const menu = buildDarwinDesktopMenu({
      locale,
      appName: 'DSH Desktop Shell',
      openEnterprise,
      showAbout,
      checkForUpdates,
      restart,
      restartSafeMode,
      hide,
      hideOthers,
      unhideAll,
      quit
    })
    const submenu = menu[0]?.submenu ?? []
    expect(submenu[0]?.label).toBe(locale.startsWith('zh') ? '关于 DSH Desktop' : 'About DSH Desktop')
    expect(submenu[1]?.label).toBe(locale.startsWith('zh') ? '检查更新…' : 'Check for Updates…')
    expect(submenu[1]?.accelerator).toBe('CmdOrCtrl+U')
    expect(submenu[2]?.label).toBe(locale.startsWith('zh') ? '了解企业版' : 'Explore Enterprise')
    expect(submenu[3]?.label).toBe(locale.startsWith('zh') ? '重启' : 'Restart')
    expect(submenu[3]?.accelerator).toBe('CmdOrCtrl+Shift+R')
    expect(submenu[4]?.label).toBe(locale.startsWith('zh') ? '以安全模式重启…' : 'Restart as Safe Mode…')
    submenu[0]?.click?.()
    submenu[1]?.click?.()
    submenu[2]?.click?.()
    submenu[3]?.click?.()
    submenu[4]?.click?.()
    expect(showAbout).toHaveBeenCalledOnce()
    expect(checkForUpdates).toHaveBeenCalledOnce()
    expect(openEnterprise).toHaveBeenCalledOnce()
    expect(restart).toHaveBeenCalledOnce()
    expect(restartSafeMode).toHaveBeenCalledOnce()
    submenu[6]?.click?.()
    submenu[7]?.click?.()
    submenu[8]?.click?.()
    submenu[10]?.click?.()
    expect(hide).toHaveBeenCalledOnce()
    expect(hideOthers).toHaveBeenCalledOnce()
    expect(unhideAll).toHaveBeenCalledOnce()
    expect(quit).toHaveBeenCalledOnce()
    const standard = standardMenuLabels(locale)
    expect(menu.map(item => item.label)).toEqual(['DSH Desktop Shell', standard.edit, standard.window])
    expect(menu[1]?.submenu?.[0]).toMatchObject({ role: 'undo', label: standard.undo })
    expect(menu[1]?.submenu?.[6]).toMatchObject({ role: 'selectAll', label: standard.selectAll })
    expect(menu[2]?.submenu?.[0]).toMatchObject({ role: 'minimize', label: standard.minimize })
    expect(menu[2]?.submenu?.[1]).toMatchObject({ role: 'close', label: standard.close })
    const withoutSafeMode = buildDarwinDesktopMenu({
      locale,
      appName: 'DSH Desktop Shell',
      openEnterprise,
      showAbout,
      checkForUpdates,
      hide,
      hideOthers,
      unhideAll,
      quit
    })
    expect((withoutSafeMode[0]?.submenu ?? []).some(item => item.label === safeModeMenuLabel(locale))).toBe(false)
  })

  it('places the file menu after the application menu', () => {
    const labels = shortcutFileMenuLabels('zh-CN')
    const menu = insertFileMenu([
      { label: 'DSH Desktop Shell', submenu: [{ label: '关于 DSH Desktop' }] },
      { label: 'Edit' }
    ], { label: labels.fileMenu, submenu: [{ label: labels.closePage }] })
    expect(menu[0]?.submenu?.[0]?.label).toBe('关于 DSH Desktop')
    expect(menu[1]?.label).toBe('文件')
    expect(menu[1]?.submenu?.[0]?.label).toBe('关闭页面或窗口')
    expect(menu[2]?.label).toBe('Edit')
    expect(shortcutFileMenuLabels('en-US').closePage).toBe('Close Page or Window')
  })

  it('keeps Windows accelerators on a hidden application menu', () => {
    const calls: string[] = []
    const menu = buildWindowsApplicationMenu({
      locale: 'zh-CN',
      connectPhone: () => { calls.push('phone') },
      restart: () => { calls.push('restart') },
      restartSafeMode: () => { calls.push('safe') },
      showHarnessLog: () => { calls.push('log') },
      checkForUpdates: () => { calls.push('update') },
      quit: () => { calls.push('quit') }
    })
    const labels = menu.flatMap(item => [item.label, ...(item.submenu ?? []).map(child => child.label)])
    expect(labels).toEqual(expect.arrayContaining(['应用', '连接手机…', '重启', '显示 Harness 日志', '编辑', '视图', '窗口']))
    const accelerators = menu.flatMap(item => (item.submenu ?? []).map(child => child.accelerator))
    expect(accelerators).toEqual(expect.arrayContaining(['CmdOrCtrl+Shift+M', 'CmdOrCtrl+Shift+R', 'CmdOrCtrl+U']))
    const roles = menu.flatMap(item => (item.submenu ?? []).map(child => child.role))
    expect(roles).toEqual(expect.arrayContaining(['undo', 'copy', 'reload', 'zoomIn', 'togglefullscreen', 'quit']))
    menu[0]?.submenu?.[0]?.click?.()
    expect(calls).toEqual(['phone'])
    const withoutSafeMode = buildWindowsApplicationMenu({
      locale: 'en',
      connectPhone: () => {},
      restart: () => {},
      showHarnessLog: () => {},
      checkForUpdates: () => {},
      quit: () => {}
    })
    expect((withoutSafeMode[0]?.submenu ?? []).some(item => item.label === safeModeMenuLabel('en'))).toBe(false)
    expect(withoutSafeMode[0]?.label).toBe('Application')
  })

  it('installs the menu from the new shell', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(source.includes('buildDarwinDesktopMenu(')).toBe(true)
    expect(source.includes('locale: menuLocale')).toBe(true)
    expect(source.includes('savedDesktopMenuLocale(')).toBe(true)
    expect(source.includes('menuLocale = resolved')).toBe(true)
    expect(source.includes('ENTERPRISE_URL')).toBe(true)
    expect(source.includes('externalUrlToOpen(')).toBe(true)
    expect(source.includes('registerUpdateHandlers(')).toBe(true)
    expect(source.includes('startUpdateManager(')).toBe(true)
    expect(source.includes('if (app.isPackaged && !desktopDevelopmentBuild()) initializeDesktopUpdateService()')).toBe(true)
    expect(source.includes('initializeDesktopService(')).toBe(false)
    expect(source.includes('checkForUpdates(true)')).toBe(true)
    expect(source.includes('desktop:show-about')).toBe(true)
    expect(source.includes('presentAbout(target, menuLocale)')).toBe(true)
    expect(source.includes('locale: () => menuLocale')).toBe(true)
    expect(source.includes('desktop:ui-locale')).toBe(true)
    expect(source.includes('void restartDesktop()')).toBe(true)
    expect(source.includes('restartInSafeMode()')).toBe(true)
    expect(source.includes('shouldStartInSafeMode(process.argv)')).toBe(true)
    expect(source.includes('bundledHarnessVersion(')).toBe(true)
    expect(source.includes("app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop'))")).toBe(true)
    expect(source.includes('configureDesktopIdentity()')).toBe(true)
    expect(source.includes('mandatory-update')).toBe(false)
    expect(source.includes('autoDownload = true')).toBe(false)
  })
})