import { describe, expect, it, vi } from 'vitest'
import { applySafeModeFrameLeft } from '../src/preload/safe-mode-frame-layout'

describe('Safe Mode frame layout', () => {
  it('starts to the right of the Harness session sidebar', () => {
    const frame = { style: { left: '0px' } }
    const sidebar = { getBoundingClientRect: vi.fn(() => ({ right: 287.6 })) }

    applySafeModeFrameLeft(frame, sidebar)

    expect(frame.style.left).toBe('288px')
    expect(sidebar.getBoundingClientRect).toHaveBeenCalledOnce()
  })

  it('falls back safely before the sidebar is mounted', () => {
    const frame = { style: { left: '120px' } }

    applySafeModeFrameLeft(frame)

    expect(frame.style.left).toBe('0px')
  })
})
