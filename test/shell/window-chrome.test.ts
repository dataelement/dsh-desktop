import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { desktopBrandLogoPaths } from '../../src/main/shell/brand-logo'
import { workspaceDirectoryPrompt } from '../../src/main/shell/directory-picker'
import { desktopWindowChrome, windowsChromeBackground, windowsTitleBarOverlay } from '../../src/main/shell/window-chrome'
import { WINDOWS_TITLEBAR_HEIGHT } from '../../src/shared/desktop-menu'

describe('desktop window chrome', () => {
  it('places the macOS traffic lights on the sidebar row', () => {
    expect(desktopWindowChrome('darwin')).toEqual({
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 18 },
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      backgroundColor: '#00000000'
    })
    expect(desktopWindowChrome('linux')).toEqual({})
  })

  it('hides the Windows frame so the page caption replaces File, Edit, View and Window', () => {
    expect(desktopWindowChrome('win32', true)).toEqual({
      titleBarStyle: 'hidden',
      titleBarOverlay: windowsTitleBarOverlay(true),
      autoHideMenuBar: true,
      backgroundColor: '#141416'
    })
    expect(windowsTitleBarOverlay(false)).toEqual({
      color: '#00000000',
      symbolColor: '#202124',
      height: WINDOWS_TITLEBAR_HEIGHT
    })
    expect(windowsTitleBarOverlay(true).symbolColor).toBe('#f3f4f6')
    expect(windowsChromeBackground(true)).toBe('#141416')
    expect(windowsChromeBackground(false)).toBe('#ffffff')
  })
})

describe('desktop brand logos', () => {
  it('uses the first root that has both pairing wordmarks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-brand-'))
    const dist = join(root, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist')
    await mkdir(dist, { recursive: true })
    await writeFile(join(dist, 'dsh-desktop-logo-light.png'), 'light')
    await writeFile(join(dist, 'dsh-desktop-logo-dark.png'), 'dark')
    const logos = desktopBrandLogoPaths(['/missing', root])
    expect(logos?.light.endsWith('dsh-desktop-logo-light.png')).toBe(true)
    expect(logos?.dark.endsWith('dsh-desktop-logo-dark.png')).toBe(true)
    expect(desktopBrandLogoPaths(['/missing'])).toBeUndefined()
  })
})

describe('workspace directory picker', () => {
  it('names the folder panel in the Desktop language', () => {
    expect(workspaceDirectoryPrompt('zh')).toBe('选择工作区目录')
    expect(workspaceDirectoryPrompt('en')).toBe('Select Workspace Directory')
  })
})
