import { describe, expect, it, vi } from 'vitest'
import {
  apply,
  ensureDefaultWorkspace,
  inject,
  name
} from '../packages/dsh-desktop-client-ui/index.js'

describe('default workspace seed', () => {
  it('registers the launch directory through the workspace controller', async () => {
    const create = vi.fn(async (request: { path: string }) => ({
      workspace: { path: request.path },
      created: true
    }))

    await ensureDefaultWorkspace({ create }, '/tmp/launch-root')

    expect(create).toHaveBeenCalledWith({ path: '/tmp/launch-root' })
    expect(name).toBe('dsh-desktop-client-ui')
    expect(inject).toEqual(['workspaceController'])
  })

  it('seeds process.cwd on host apply and keeps brand load if create fails', async () => {
    const create = vi.fn(async () => {
      throw new Error('workspace/invalid-path')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await apply({ workspaceController: { create } })

    expect(create).toHaveBeenCalledWith({ path: process.cwd() })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
