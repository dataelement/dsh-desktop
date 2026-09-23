import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }))

import { desktopResourceUrl, resolveDesktopResourceName } from '../src/main/desktop-protocol'

describe('resolveDesktopResourceName', () => {
  it('names a page or asset in the desktop resources', () => {
    expect(resolveDesktopResourceName('dsh-desktop://desktop/safe-mode.html?state=%7B%7D')).toBe('safe-mode.html')
    expect(resolveDesktopResourceName('dsh-desktop://desktop/community-wechat-qr.png')).toBe('community-wechat-qr.png')
    expect(resolveDesktopResourceName('dsh-desktop://desktop/app-icon.png#x')).toBe('app-icon.png')
  })

  it('refuses other schemes and hosts', () => {
    expect(resolveDesktopResourceName('file:///safe-mode.html')).toBeUndefined()
    expect(resolveDesktopResourceName('dsh-desktop://other/safe-mode.html')).toBeUndefined()
    expect(resolveDesktopResourceName('http://127.0.0.1/safe-mode.html')).toBeUndefined()
    expect(resolveDesktopResourceName('not a url')).toBeUndefined()
  })

  it('refuses nested paths, traversal and unservable types', () => {
    expect(resolveDesktopResourceName('dsh-desktop://desktop/../package.json')).toBeUndefined()
    expect(resolveDesktopResourceName('dsh-desktop://desktop/%2e%2e/package.json')).toBeUndefined()
    expect(resolveDesktopResourceName('dsh-desktop://desktop/sub/safe-mode.html')).toBeUndefined()
    expect(resolveDesktopResourceName('dsh-desktop://desktop/installer.nsh')).toBeUndefined()
    expect(resolveDesktopResourceName('dsh-desktop://desktop/')).toBeUndefined()
  })
})

describe('desktopResourceUrl', () => {
  it('builds a desktop URL the resolver accepts, with the query encoded', () => {
    const url = desktopResourceUrl('safe-mode.html', { state: '{"locale":"zh"}', theme: 'dark' })
    expect(url).toBe('dsh-desktop://desktop/safe-mode.html?state=%7B%22locale%22%3A%22zh%22%7D&theme=dark')
    expect(resolveDesktopResourceName(url)).toBe('safe-mode.html')
  })
})
