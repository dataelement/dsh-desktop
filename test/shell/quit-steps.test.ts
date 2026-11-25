import { describe, expect, it, vi } from 'vitest'
import { runQuitSteps } from '../../src/main/shell/quit-steps'

describe('quit steps', () => {
  it('keeps shutting down when Safe Mode has no phone bridge', async () => {
    const order: string[] = []
    const logged: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((error: unknown) => {
      logged.push(error instanceof Error ? error.message : String(error))
    })
    await runQuitSteps([
      () => {
        order.push('files')
        return Promise.resolve()
      },
      () => undefined,
      () => {
        order.push('journal')
        return Promise.reject(new Error('journal failed'))
      },
      () => {
        order.push('host')
        return Promise.resolve()
      }
    ])
    spy.mockRestore()
    expect(order).toEqual(['files', 'journal', 'host'])
    expect(logged).toEqual(['journal failed'])
  })
})
