import { describe, expect, it, vi } from 'vitest'
import { desktopFileUrl, navigateDesktopWindow } from '../src/main/desktop-navigation'

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
