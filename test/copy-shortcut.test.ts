import { describe, expect, it } from 'vitest'
import { isWindowsCopyShortcut, type CopyShortcutInput } from '../src/main/copy-shortcut'

function input(overrides: Partial<CopyShortcutInput> = {}): CopyShortcutInput {
  return {
    type: 'keyDown',
    key: 'c',
    control: true,
    shift: false,
    alt: false,
    meta: false,
    ...overrides
  }
}

describe('Windows copy shortcut fallback', () => {
  it('handles Ctrl+C keydown on Windows', () => {
    expect(isWindowsCopyShortcut(input(), 'win32')).toBe(true)
    expect(isWindowsCopyShortcut(input({ key: 'C' }), 'win32')).toBe(true)
  })

  it('does not replace native editing shortcuts on other platforms', () => {
    expect(isWindowsCopyShortcut(input(), 'darwin')).toBe(false)
    expect(isWindowsCopyShortcut(input(), 'linux')).toBe(false)
  })

  it('ignores keyup, other keys, and additional modifiers', () => {
    expect(isWindowsCopyShortcut(input({ type: 'keyUp' }), 'win32')).toBe(false)
    expect(isWindowsCopyShortcut(input({ key: 'x' }), 'win32')).toBe(false)
    expect(isWindowsCopyShortcut(input({ control: false }), 'win32')).toBe(false)
    expect(isWindowsCopyShortcut(input({ shift: true }), 'win32')).toBe(false)
    expect(isWindowsCopyShortcut(input({ alt: true }), 'win32')).toBe(false)
    expect(isWindowsCopyShortcut(input({ meta: true }), 'win32')).toBe(false)
  })
})
