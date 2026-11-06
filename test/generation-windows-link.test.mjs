import { describe, expect, it, vi } from 'vitest'
import { placeProfilePackageLink } from '../packages/dsh-desktop-market-installer/generations/projection.mjs'

const missing = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' })

function callsOf(fn) {
  return fn.mock.calls.map(call => call)
}

describe('Windows profile package links', () => {
  it('creates a missing junction at the final path instead of renaming it', async () => {
    const fs = {
      symlink: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      unlink: vi.fn(async () => { throw missing() }),
      readlink: vi.fn(async () => { throw missing() })
    }
    const state = { previousTarget: undefined, movedOld: false, installedNew: false }
    await placeProfilePackageLink(fs, {
      platform: 'win32',
      link: 'C:\\profile\\node_modules\\dsh-context',
      target: 'C:\\profile\\.generations\\live\\dsh-context\\node_modules\\dsh-context',
      previousIsDirectory: false,
      nextLink: 'C:\\profile\\node_modules\\dsh-context.dsh-next',
      oldLink: 'C:\\profile\\node_modules\\dsh-context.dsh-previous'
    }, state)
    expect(callsOf(fs.symlink)).toEqual([[
      'C:\\profile\\.generations\\live\\dsh-context\\node_modules\\dsh-context',
      'C:\\profile\\node_modules\\dsh-context',
      'junction'
    ]])
    expect(fs.rename).not.toHaveBeenCalled()
    expect(state).toEqual({ previousTarget: undefined, movedOld: false, installedNew: true })
  })

  it('replaces an existing junction in place and remembers its target', async () => {
    const fs = {
      symlink: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      unlink: vi.fn(async () => {}),
      readlink: vi.fn(async () => 'C:\\profile\\.generations\\live\\old\\node_modules\\dsh-context')
    }
    const state = { previousTarget: undefined, movedOld: false, installedNew: false }
    await placeProfilePackageLink(fs, {
      platform: 'win32',
      link: 'C:\\profile\\node_modules\\dsh-context',
      target: 'C:\\profile\\.generations\\live\\new\\node_modules\\dsh-context',
      previousIsDirectory: false,
      nextLink: 'C:\\profile\\node_modules\\dsh-context.dsh-next',
      oldLink: 'C:\\profile\\node_modules\\dsh-context.dsh-previous'
    }, state)
    expect(fs.unlink).toHaveBeenCalledWith('C:\\profile\\node_modules\\dsh-context')
    expect(fs.rename).not.toHaveBeenCalled()
    expect(state.previousTarget).toBe('C:\\profile\\.generations\\live\\old\\node_modules\\dsh-context')
    expect(state.movedOld).toBe(true)
    expect(fs.symlink).toHaveBeenCalledWith(
      'C:\\profile\\.generations\\live\\new\\node_modules\\dsh-context',
      'C:\\profile\\node_modules\\dsh-context',
      'junction'
    )
  })

  it('still stages and renames a symlink on other platforms', async () => {
    const fs = {
      symlink: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      unlink: vi.fn(async () => {}),
      readlink: vi.fn(async () => { throw missing() })
    }
    const state = { previousTarget: undefined, movedOld: false, installedNew: false }
    await placeProfilePackageLink(fs, {
      platform: 'darwin',
      link: '/profile/node_modules/dsh-context',
      target: '/profile/.generations/live/dsh-context/node_modules/dsh-context',
      previousIsDirectory: false,
      nextLink: '/profile/node_modules/dsh-context.dsh-next',
      oldLink: '/profile/node_modules/dsh-context.dsh-previous'
    }, state)
    expect(fs.symlink).toHaveBeenCalledWith(
      '/profile/.generations/live/dsh-context/node_modules/dsh-context',
      '/profile/node_modules/dsh-context.dsh-next',
      'dir'
    )
    expect(fs.rename).toHaveBeenCalledWith(
      '/profile/node_modules/dsh-context.dsh-next',
      '/profile/node_modules/dsh-context'
    )
  })
})
