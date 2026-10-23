import { describe, expect, it, vi } from 'vitest'
import { desktopFileUrl, navigateDesktopWindow, replaceDesktopWindowPage } from '../src/main/desktop-navigation'

describe('desktop navigation lifecycle', () => {
  it('keeps the original load failure without retrying with loadFile', async () => {
    const error = Object.assign(new Error('file load failed'), { code: 'ERR_FAILED' })
    const target = { isDestroyed: () => false, loadURL: vi.fn().mockRejectedValue(error) }
    await expect(navigateDesktopWindow(target, 'file:///missing.html', () => false)).rejects.toBe(error)
    expect(target.loadURL).toHaveBeenCalledTimes(1)
  })

  it.each(['destroyed', 'quitting', 'relaunching', 'superseded'])('ignores pending rejection after %s', async reason => {
    let cancelled = false
    let destroyed = false
    const target = { isDestroyed: () => destroyed, loadURL: vi.fn(async () => {
      if (reason === 'destroyed') destroyed = true
      else cancelled = true
      throw new Error('Object has been destroyed')
    }) }
    expect(await navigateDesktopWindow(target, 'file:///splash.html', () => cancelled)).toBe(false)
    expect(target.loadURL).toHaveBeenCalledTimes(1)
  })

  it('ignores a cancelled navigation and does not begin loading after shutdown', async () => {
    const target = { isDestroyed: () => false, loadURL: vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { code: 'ERR_ABORTED' })) }
    expect(await navigateDesktopWindow(target, 'file:///splash.html', () => false)).toBe(false)
    target.loadURL.mockClear()
    expect(await navigateDesktopWindow(target, 'file:///splash.html', () => true)).toBe(false)
    expect(target.loadURL).not.toHaveBeenCalled()
  })

  it('encodes file paths and query once and reports a current navigation as loaded', async () => {
    const url = desktopFileUrl('/tmp/app resources/splash.html', { theme: 'dark', state: 'a&b' })
    expect(new URL(url).searchParams.get('state')).toBe('a&b')
    expect(url).toContain('app%20resources')
    const target = { isDestroyed: () => false, loadURL: vi.fn().mockResolvedValue(undefined) }
    expect(await navigateDesktopWindow(target, url, () => false)).toBe(true)
  })
})

describe('shell page replacement history', () => {
  it('preserves ordinary document navigation history for Back/Forward', async () => {
    const entries = ['http://127.0.0.1:3080/']
    const clear = vi.fn(() => { entries.splice(0, entries.length - 1) })
    const target = {
      isDestroyed: () => false,
      loadURL: vi.fn(async (url: string) => { entries.push(url) }),
      webContents: { navigationHistory: { clear } }
    }
    expect(await navigateDesktopWindow(target, 'http://127.0.0.1:3080/details', () => false)).toBe(true)
    expect(entries).toEqual(['http://127.0.0.1:3080/', 'http://127.0.0.1:3080/details'])
    expect(clear).not.toHaveBeenCalled()
  })

  it('removes obsolete shell pages only after the replacement commits', async () => {
    const entries = ['file:///splash.html']
    const operations: string[] = []
    const clear = vi.fn(() => { operations.push('clear'); entries.splice(0, entries.length - 1) })
    const target = {
      isDestroyed: () => false,
      loadURL: vi.fn(async (url: string) => {
        operations.push('load:' + url)
        entries.push(url)
      }),
      webContents: { navigationHistory: { clear } }
    }
    await replaceDesktopWindowPage(target, 'http://127.0.0.1:3080/', () => false)
    expect(entries).toEqual(['http://127.0.0.1:3080/'])
    await replaceDesktopWindowPage(target, 'file:///plugin-recovery.html', () => false)
    expect(entries).toEqual(['file:///plugin-recovery.html'])
    expect(clear).toHaveBeenCalledTimes(2)
    expect(operations).toEqual(['load:http://127.0.0.1:3080/', 'clear', 'load:file:///plugin-recovery.html', 'clear'])
  })

  it.each(['destroyed', 'quitting', 'superseded'])('preserves history when a pending replacement becomes %s', async reason => {
    let cancelled = false
    let destroyed = false
    const clear = vi.fn()
    const target = {
      isDestroyed: () => destroyed,
      loadURL: vi.fn(async () => {
        if (reason === 'destroyed') destroyed = true
        else cancelled = true
      }),
      webContents: { navigationHistory: { clear } }
    }
    expect(await replaceDesktopWindowPage(target, 'file:///splash.html', () => cancelled)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })

  it('retains real load failures and does not clear history after an aborted load', async () => {
    const error = Object.assign(new Error('missing shell resource'), { code: 'ERR_FILE_NOT_FOUND' })
    const clear = vi.fn()
    const target = {
      isDestroyed: () => false,
      loadURL: vi.fn().mockRejectedValue(error),
      webContents: { navigationHistory: { clear } }
    }
    await expect(replaceDesktopWindowPage(target, 'file:///missing.html', () => false)).rejects.toBe(error)
    target.loadURL.mockRejectedValue(Object.assign(new Error('aborted'), { code: 'ERR_ABORTED' }))
    expect(await replaceDesktopWindowPage(target, 'file:///splash.html', () => false)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })

  it('does not start a replacement after shutdown or report history cleanup failures as success', async () => {
    const error = new Error('history unavailable')
    const target = {
      isDestroyed: () => false,
      loadURL: vi.fn().mockResolvedValue(undefined),
      webContents: { navigationHistory: { clear: vi.fn(() => { throw error }) } }
    }
    expect(await replaceDesktopWindowPage(target, 'file:///splash.html', () => true)).toBe(false)
    expect(target.loadURL).not.toHaveBeenCalled()
    await expect(replaceDesktopWindowPage(target, 'file:///splash.html', () => false)).rejects.toBe(error)
  })
})
