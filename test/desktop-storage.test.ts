import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DesktopStorageManager, STORAGE_FILENAME } from '../src/main/state/desktop-storage'

describe('DesktopStorageManager', () => {
  it('starts with empty store when storage file does not exist', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      const manager = new DesktopStorageManager(tempDir)
      expect(manager.getAll()).toEqual({})
      expect(manager.getItem('foo')).toBeNull()
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('sets, gets, removes and clears in-memory storage', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      const manager = new DesktopStorageManager(tempDir)

      manager.setItem('key1', 'value1')
      manager.setItem('key2', '123')
      expect(manager.getItem('key1')).toBe('value1')
      expect(manager.getItem('key2')).toBe('123')
      expect(manager.getAll()).toEqual({ key1: 'value1', key2: '123' })

      manager.removeItem('key1')
      expect(manager.getItem('key1')).toBeNull()
      expect(manager.getAll()).toEqual({ key2: '123' })

      manager.clear()
      expect(manager.getAll()).toEqual({})
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('flushes synchronously and restores data on reload', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      const manager1 = new DesktopStorageManager(tempDir)
      manager1.setItem('plugin-theme', 'dark')
      manager1.setItem('plugin-token', 'abc-xyz-999')
      manager1.flushSync()

      const fileContent = await readFile(join(tempDir, STORAGE_FILENAME), 'utf8')
      const parsed = JSON.parse(fileContent)
      expect(parsed).toEqual({
        'plugin-theme': 'dark',
        'plugin-token': 'abc-xyz-999'
      })

      // Simulate a new app launch reading the same profile directory
      const manager2 = new DesktopStorageManager(tempDir)
      expect(manager2.getItem('plugin-theme')).toBe('dark')
      expect(manager2.getItem('plugin-token')).toBe('abc-xyz-999')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('debounces async flushes', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      const manager = new DesktopStorageManager(tempDir, { debounceMs: 50 })
      manager.setItem('async-key', 'first')
      manager.setItem('async-key', 'second')

      // Wait for debounce timeout
      await new Promise((resolve) => setTimeout(resolve, 100))

      const fileContent = await readFile(join(tempDir, STORAGE_FILENAME), 'utf8')
      expect(JSON.parse(fileContent)).toEqual({ 'async-key': 'second' })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('handles corrupted JSON files gracefully without throwing', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      await writeFile(join(tempDir, STORAGE_FILENAME), 'INVALID_NOT_A_JSON{', 'utf8')

      let reportedError = false
      const manager = new DesktopStorageManager(tempDir, {
        onError: (_err, context) => {
          if (context === 'load-from-disk') reportedError = true
        }
      })

      expect(reportedError).toBe(true)
      expect(manager.getAll()).toEqual({})

      // Still allows writing and overwrites corrupted file cleanly
      manager.setItem('recovered', 'true')
      manager.flushSync()

      const restored = new DesktopStorageManager(tempDir)
      expect(restored.getItem('recovered')).toBe('true')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('applies batch actions correctly', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-storage-test-'))
    try {
      const manager = new DesktopStorageManager(tempDir)
      manager.applyAction({ type: 'set', key: 'a', val: '1' })
      manager.applyAction({ type: 'set', key: 'b', val: '2' })
      expect(manager.getAll()).toEqual({ a: '1', b: '2' })

      manager.applyAction({ type: 'remove', key: 'a' })
      expect(manager.getAll()).toEqual({ b: '2' })

      manager.applyAction({ type: 'clear' })
      expect(manager.getAll()).toEqual({})
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('supports switching profiles', async () => {
    const dir1 = await mkdtemp(join(tmpdir(), 'dsh-profile1-'))
    const dir2 = await mkdtemp(join(tmpdir(), 'dsh-profile2-'))
    try {
      const manager = new DesktopStorageManager(dir1)
      manager.setItem('p1', 'val1')
      manager.flushSync()

      manager.switchProfile(dir2)
      expect(manager.getAll()).toEqual({})

      manager.setItem('p2', 'val2')
      manager.flushSync()

      const restored1 = new DesktopStorageManager(dir1)
      const restored2 = new DesktopStorageManager(dir2)
      expect(restored1.getItem('p1')).toBe('val1')
      expect(restored2.getItem('p2')).toBe('val2')
    } finally {
      await rm(dir1, { recursive: true, force: true })
      await rm(dir2, { recursive: true, force: true })
    }
  })
})
