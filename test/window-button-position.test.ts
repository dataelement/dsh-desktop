import { describe, expect, it } from 'vitest'
import { MAC_WINDOW_BUTTON_POSITION } from '../src/main/window-button-position'

describe('macOS traffic light alignment', () => {
  it('uses an immutable native position centered in the Actual Size rail', () => {
    expect(MAC_WINDOW_BUTTON_POSITION).toEqual({ x: 18, y: 9 })
    expect(MAC_WINDOW_BUTTON_POSITION.x + 60 / 2).toBe(96 / 2)
    expect(Object.isFrozen(MAC_WINDOW_BUTTON_POSITION)).toBe(true)
  })
})
