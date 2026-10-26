import { createRequire } from 'node:module'
import { expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { WindowsPtyAgent } = require('node-pty/lib/windowsPtyAgent.js')

it('drains the ConPTY output worker on kill even when no further data arrives', () => {
  const dispose = vi.fn(), kill = vi.fn(), destroy = vi.fn(), on = vi.fn()
  const agent = {
    _clearConnectionTimeout: vi.fn(), _pendingPtyInfo: {}, _useConptyDll: true,
    _inSocket: { destroy }, _outSocket: { on },
    _ptyNative: { kill }, _pty: 42, _conoutSocketWorker: { dispose }
  }
  WindowsPtyAgent.prototype.kill.call(agent)
  expect(destroy).toHaveBeenCalledOnce()
  expect(kill).toHaveBeenCalledWith(42, true)
  expect(dispose).toHaveBeenCalledOnce()
  expect(agent._pendingPtyInfo).toBeUndefined()
})
