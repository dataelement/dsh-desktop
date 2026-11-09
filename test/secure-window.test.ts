import { beforeEach, describe, expect, it, vi } from 'vitest'
import { secureWindow } from '../src/main/security'

const shell = vi.hoisted(() => ({ openExternal: vi.fn(async () => undefined) }))
vi.mock('electron', () => ({ shell }))
vi.mock('../src/main/window-permissions', () => ({ installWindowPermissions: vi.fn() }))

type OpenHandler = (details: { url: string }) => { action: 'allow' | 'deny' }

function setup(appUrls?: () => readonly (string | undefined)[]) {
  let open: OpenHandler | undefined
  const webContents = {
    getURL: vi.fn(() => 'dsh-desktop://harness/'),
    setWindowOpenHandler: vi.fn((handler: OpenHandler) => { open = handler }),
    on: vi.fn(),
    session: {}
  }
  secureWindow({ webContents } as never, true, true, appUrls)
  if (open === undefined) throw new Error('window open handler was not installed')
  return open
}

describe('secureWindow popups', () => {
  beforeEach(() => shell.openExternal.mockClear())

  it('opens a link to an unrelated local server in the system browser', () => {
    const open = setup(() => ['http://127.0.0.1:43127/'])
    expect(open({ url: 'http://127.0.0.1:5180/' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).toHaveBeenCalledWith('http://127.0.0.1:5180/')
  })

  it('keeps popups to the running Harness backend in the app', () => {
    const open = setup(() => ['http://127.0.0.1:43127/'])
    expect(open({ url: 'http://127.0.0.1:43127/api/file?id=1' })).toEqual({ action: 'allow' })
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('opens local servers externally when no backend is running', () => {
    const open = setup()
    expect(open({ url: 'http://localhost:3000/' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).toHaveBeenCalledWith('http://localhost:3000/')
  })
})
