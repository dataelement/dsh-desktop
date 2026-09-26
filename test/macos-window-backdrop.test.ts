import { expect, it, vi } from 'vitest'
import { applyMacosWindowBackdrop } from '../src/main/macos-window-backdrop'

it.each([false, true])('restores sidebar vibrancy after hiding or minimizing (dark=%s)', dark => {
  let visible = true
  let minimized = false
  const window = { isDestroyed: () => false, isMinimized: () => minimized, isVisible: () => visible,
    setVibrancy: vi.fn(), setBackgroundColor: vi.fn() }
  applyMacosWindowBackdrop(window, dark)
  expect(window.setVibrancy).toHaveBeenLastCalledWith('sidebar')
  expect(window.setBackgroundColor).toHaveBeenLastCalledWith('#00000000')
  for (const state of ['minimized', 'hidden']) {
    minimized = state === 'minimized'
    visible = state !== 'hidden'
    applyMacosWindowBackdrop(window, dark)
    expect(window.setVibrancy).toHaveBeenLastCalledWith(null)
    expect(window.setBackgroundColor).toHaveBeenLastCalledWith(dark ? '#1b1b1c' : '#f9fafb')
  }
  visible = true
  minimized = false
  applyMacosWindowBackdrop(window, dark)
  expect(window.setVibrancy).toHaveBeenLastCalledWith('sidebar')
  expect(window.setBackgroundColor).toHaveBeenLastCalledWith('#00000000')
})
