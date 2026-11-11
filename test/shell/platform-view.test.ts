import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ fromPartition: vi.fn(), createView: vi.fn(), headers: vi.fn() }))
vi.mock('electron', () => ({
  WebContentsView: native.createView,
  session: { fromPartition: native.fromPartition },
  shell: { openExternal: vi.fn() }
}))
vi.mock('@deepseek-ai/dsh-deepseek-account', () => ({
  mergePlatformCookies: vi.fn(),
  platformClientHeaders: native.headers
}))

import { DesktopPlatformView } from '../../src/main/shell/window/platform-view'

describe('platform account view availability', () => {
  it('passes the real runtime platform from the application composition root', async () => {
    const source = await readFile(new URL('../../src/main/shell/app.ts', import.meta.url), 'utf8')
    // Supplement the behavioral guard below: mapping Linux to darwin here bypasses it.
    expect(source).toMatch(/new DesktopPlatformView\(\s*preload,\s*[^\n]+,\s*process\.platform,\s*app\.getVersion\(\)/u)
  })

  it('rejects Linux before creating storage, headers or a native view, even with an account', async () => {
    const blocked = vi.fn(() => false)
    const view = new DesktopPlatformView('/preload.js', () => 'en_US', 'linux', '1.0.0', blocked)
    const owner = Object.assign(new EventEmitter(), {
      webContents: new EventEmitter(),
      contentView: { addChildView: vi.fn(), removeChildView: vi.fn() },
      isDestroyed: () => false
    })
    view.setSession({ origin: 'https://example.invalid', token: 'test-token', userId: null })
    for (const page of ['usage', 'top-up'] as const) {
      await expect(view.open(owner, page, { x: 0, y: 0, width: 100, height: 100 }))
        .rejects.toThrow('Platform view unsupported on this platform')
    }
    expect(native.fromPartition).not.toHaveBeenCalled()
    expect(native.createView).not.toHaveBeenCalled()
    expect(native.headers).not.toHaveBeenCalled()
    expect(blocked).not.toHaveBeenCalled()
    expect(owner.eventNames()).toEqual([])
    expect(() => view.bootstrap({ sender: owner.webContents, senderFrame: null })).toThrow('Rejected Platform bootstrap')
    await view.dispose()
  })

  it.each(['darwin', 'win32'] as const)('keeps %s account views inactive without a session', async platform => {
    const view = new DesktopPlatformView('/preload.js', () => 'en_US', platform, '1.0.0', () => false)
    const owner = Object.assign(new EventEmitter(), {
      webContents: new EventEmitter(),
      contentView: { addChildView: vi.fn(), removeChildView: vi.fn() },
      isDestroyed: () => false
    })
    await expect(view.open(owner, 'usage', { x: 0, y: 0, width: 100, height: 100 }))
      .rejects.toThrow('Platform account unavailable')
    expect(native.fromPartition).not.toHaveBeenCalled()
    await view.dispose()
  })
})
