import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ENTERPRISE_URL, aboutMenuLabel, aboutUsesPage, buildDarwinDesktopMenu, enterpriseMenuLabel, externalUrlToOpen, insertFileMenu, safeModeMenuLabel, shortcutFileMenuLabels, updateMenuLabel } from '../../src/main/shell/enterprise-menu'

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
    expect(submenu[3]?.label).toBe(locale.startsWith('zh') ? '以安全模式重启…' : 'Restart as Safe Mode…')
    submenu[0]?.click?.()
    submenu[1]?.click?.()
    submenu[2]?.click?.()
    submenu[3]?.click?.()
    expect(showAbout).toHaveBeenCalledOnce()
    expect(checkForUpdates).toHaveBeenCalledOnce()
    expect(openEnterprise).toHaveBeenCalledOnce()
    expect(restartSafeMode).toHaveBeenCalledOnce()
    submenu[5]?.click?.()
    submenu[6]?.click?.()
    submenu[7]?.click?.()
    submenu[9]?.click?.()
    expect(hide).toHaveBeenCalledOnce()
    expect(hideOthers).toHaveBeenCalledOnce()
    expect(unhideAll).toHaveBeenCalledOnce()
    expect(quit).toHaveBeenCalledOnce()
    expect(menu.some(item => item.label === 'Edit')).toBe(true)
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

  it('installs the menu from the new shell', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(source.includes('buildDarwinDesktopMenu(')).toBe(true)
    expect(source.includes('ENTERPRISE_URL')).toBe(true)
    expect(source.includes('externalUrlToOpen(')).toBe(true)
    expect(source.includes('registerUpdateHandlers(')).toBe(true)
    expect(source.includes('startUpdateManager(')).toBe(true)
    expect(source.includes('checkForUpdates(true)')).toBe(true)
    expect(source.includes('desktop:show-about')).toBe(true)
    expect(source.includes('restartInSafeMode()')).toBe(true)
    expect(source.includes('shouldStartInSafeMode(process.argv)')).toBe(true)
    expect(source.includes('bundledHarnessVersion(')).toBe(true)
    expect(source.includes('mandatory-update')).toBe(false)
    expect(source.includes('autoDownload = true')).toBe(false)
  })
})