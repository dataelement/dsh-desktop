import { describe, expect, it, vi } from 'vitest'
import { raiseWindowWithoutStealingFocus } from '../src/main/window-raise'

interface WindowDouble {
  isDestroyed: ReturnType<typeof vi.fn<() => boolean>>
  isMinimized: ReturnType<typeof vi.fn<() => boolean>>
  restore: ReturnType<typeof vi.fn<() => void>>
  show: ReturnType<typeof vi.fn<() => void>>
  showInactive: ReturnType<typeof vi.fn<() => void>>
  focus: ReturnType<typeof vi.fn<() => void>>
}

function makeWindow(overrides: Partial<WindowDouble> = {}): WindowDouble {
  return {
    isDestroyed: overrides.isDestroyed ?? vi.fn(() => false),
    isMinimized: overrides.isMinimized ?? vi.fn(() => false),
    restore: overrides.restore ?? vi.fn(),
    show: overrides.show ?? vi.fn(),
    showInactive: overrides.showInactive ?? vi.fn(),
    focus: overrides.focus ?? vi.fn()
  }
}

describe('raiseWindowWithoutStealingFocus', () => {
  it('uses showInactive for an automatic macOS transition while another app is active', () => {
    const window = makeWindow({ isMinimized: vi.fn(() => true) })
    const isAppActive = vi.fn(() => false)

    raiseWindowWithoutStealingFocus(window, 'darwin', isAppActive)

    expect(isAppActive).toHaveBeenCalledTimes(1)
    expect(window.showInactive).toHaveBeenCalledTimes(1)
    expect(window.restore).not.toHaveBeenCalled()
    expect(window.show).not.toHaveBeenCalled()
    expect(window.focus).not.toHaveBeenCalled()
  })

  it('restores and focuses an automatic macOS transition when the app is already active', () => {
    const window = makeWindow({ isMinimized: vi.fn(() => true) })

    raiseWindowWithoutStealingFocus(window, 'darwin', () => true)

    expect(window.restore).toHaveBeenCalledTimes(1)
    expect(window.show).toHaveBeenCalledTimes(1)
    expect(window.focus).toHaveBeenCalledTimes(1)
    expect(window.showInactive).not.toHaveBeenCalled()
  })

  it('focuses an explicit user action on macOS even if the app is not active yet', () => {
    const window = makeWindow()
    const isAppActive = vi.fn(() => false)

    raiseWindowWithoutStealingFocus(window, 'darwin', isAppActive, 'user')

    expect(isAppActive).not.toHaveBeenCalled()
    expect(window.show).toHaveBeenCalledTimes(1)
    expect(window.focus).toHaveBeenCalledTimes(1)
    expect(window.showInactive).not.toHaveBeenCalled()
  })

  it('preserves focus behavior and avoids macOS-only APIs on Windows', () => {
    const window = makeWindow({ isMinimized: vi.fn(() => true) })
    const isAppActive = vi.fn(() => {
      throw new Error('macOS-only API must not be called')
    })

    raiseWindowWithoutStealingFocus(window, 'win32', isAppActive)

    expect(isAppActive).not.toHaveBeenCalled()
    expect(window.restore).toHaveBeenCalledTimes(1)
    expect(window.show).toHaveBeenCalledTimes(1)
    expect(window.focus).toHaveBeenCalledTimes(1)
  })

  it('does nothing after the window is destroyed', () => {
    const window = makeWindow({ isDestroyed: vi.fn(() => true) })
    const isAppActive = vi.fn(() => true)

    raiseWindowWithoutStealingFocus(window, 'darwin', isAppActive)

    expect(isAppActive).not.toHaveBeenCalled()
    expect(window.showInactive).not.toHaveBeenCalled()
    expect(window.show).not.toHaveBeenCalled()
    expect(window.focus).not.toHaveBeenCalled()
  })
})
