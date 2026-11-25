import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DesktopStorageManager } from '../../src/main/profile/desktop-storage'
import { attachDesktopStorage, readStorageAction, type DesktopStorageIpc, type DesktopStorageIpcEvent } from '../../src/main/shell/desktop-storage-bridge'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function fakeIpc(): DesktopStorageIpc & { emit(channel: string, event: DesktopStorageIpcEvent, action?: unknown): void } {
  const listeners = new Map<string, Array<(event: DesktopStorageIpcEvent, action?: unknown) => void>>()
  return {
    removeAllListeners(channel) { listeners.delete(channel) },
    on(channel, listener) {
      const current = listeners.get(channel) ?? []
      current.push(listener)
      listeners.set(channel, current)
    },
    emit(channel, event, action) {
      for (const listener of listeners.get(channel) ?? []) listener(event, action)
    }
  }
}

describe('desktop storage bridge', () => {
  it('drops a storage action that is missing a field', () => {
    expect(readStorageAction({ type: 'set', key: 'dsh.sessions.current' })).toBeUndefined()
    expect(readStorageAction({ type: 'remove' })).toBeUndefined()
    expect(readStorageAction({ type: 'clear', key: 1 })).toEqual({ type: 'clear' })
    expect(readStorageAction(null)).toBeUndefined()
  })

  it('returns the saved session only to the owning window', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-storage-'))
    temporary.push(directory)
    const storage = new DesktopStorageManager(directory)
    storage.setItem('dsh.sessions.current', '{"sessionId":"saved"}')
    const owner = { id: 'window' }
    const ipc = fakeIpc()
    attachDesktopStorage(ipc, storage, () => owner)

    const owned: DesktopStorageIpcEvent = { sender: owner }
    ipc.emit('dsh:storage-load-sync', owned)
    expect(owned.returnValue).toMatchObject({ 'dsh.sessions.current': '{"sessionId":"saved"}' })

    const foreign: DesktopStorageIpcEvent = { sender: { id: 'other' } }
    ipc.emit('dsh:storage-load-sync', foreign)
    expect(foreign.returnValue).toEqual({})

    ipc.emit('dsh:storage-sync', foreign, { type: 'set', key: 'dsh.sessions.current', val: '{"sessionId":"other"}' })
    expect(storage.getItem('dsh.sessions.current')).toBe('{"sessionId":"saved"}')
    ipc.emit('dsh:storage-sync', owned, { type: 'set', key: 'dsh.sessions.current' })
    expect(storage.getItem('dsh.sessions.current')).toBe('{"sessionId":"saved"}')
  })

  it('wires the new shell preload to the copied profile storage', async () => {
    const preload = await readFile(join(import.meta.dirname, '../../src/preload/app.ts'), 'utf8')
    const shell = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(preload.includes('setupDesktopStoragePersistence()')).toBe(true)
    expect(shell.includes('new DesktopStorageManager(projectDir')).toBe(true)
    expect(shell.includes('desktopStorage.flushSync()')).toBe(true)
  })
})
