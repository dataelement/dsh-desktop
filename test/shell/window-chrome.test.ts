import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { desktopBrandLogoPaths } from '../../src/main/shell/brand-logo'
import { workspaceDirectoryPrompt } from '../../src/main/shell/directory-picker'
import { desktopWindowChrome } from '../../src/main/shell/window-chrome'

describe('desktop window chrome', () => {
  it('places the macOS traffic lights on the sidebar row', () => {
    expect(desktopWindowChrome('darwin')).toEqual({
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 18 },
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      backgroundColor: '#00000000'
    })
    expect(desktopWindowChrome('win32')).toEqual({})
    expect(desktopWindowChrome('linux')).toEqual({})
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
