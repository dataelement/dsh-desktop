import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { clearStaleLoopbackHttpCache } from '../src/main/cache-maintenance'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('loopback HTTP cache maintenance', () => {
  it('clears legacy origins and records the next stable origin', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-cache-test-'))
    const statePath = path.join(directory, 'http-cache-origin')
    const clearCache = vi.fn(async () => undefined)
    const note = vi.fn()

    try {
      await expect(
        clearStaleLoopbackHttpCache(
          { clearCache },
          statePath,
          'http://127.0.0.1:43129',
          note
        )
      ).resolves.toBe('cleared')
      expect(clearCache).toHaveBeenCalledOnce()
      expect(await readFile(statePath, 'utf8')).toBe('http://127.0.0.1:43129\n')
      expect(note).not.toHaveBeenCalled()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('keeps reusable cache entries when the loopback origin is unchanged', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-cache-test-'))
    const statePath = path.join(directory, 'http-cache-origin')
    await writeFile(statePath, 'http://127.0.0.1:43129\n', 'utf8')
    const clearCache = vi.fn(async () => undefined)

    try {
      await expect(
        clearStaleLoopbackHttpCache(
          { clearCache },
          statePath,
          'http://127.0.0.1:43129',
          vi.fn()
        )
      ).resolves.toBe('unchanged')
      expect(clearCache).not.toHaveBeenCalled()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('clears a fallback origin before returning to the stable origin', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-cache-test-'))
    const statePath = path.join(directory, 'http-cache-origin')
    await writeFile(statePath, 'http://127.0.0.1:54421\n', 'utf8')
    const clearCache = vi.fn(async () => undefined)

    try {
      await expect(
        clearStaleLoopbackHttpCache(
          { clearCache },
          statePath,
          'http://127.0.0.1:43129',
          vi.fn()
        )
      ).resolves.toBe('cleared')
      expect(clearCache).toHaveBeenCalledOnce()
      expect(await readFile(statePath, 'utf8')).toBe('http://127.0.0.1:43129\n')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('reports a failed cleanup without rejecting desktop startup', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-cache-test-'))
    const statePath = path.join(directory, 'http-cache-origin')
    const clearCache = vi.fn(async () => {
      throw new Error('cache is locked')
    })
    const note = vi.fn()

    try {
      await expect(
        clearStaleLoopbackHttpCache(
          { clearCache },
          statePath,
          'http://127.0.0.1:43129',
          note
        )
      ).resolves.toBe('failed')
      expect(note).toHaveBeenCalledWith(
        '[desktop] stale loopback HTTP cache cleanup failed: cache is locked'
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('clears the cache after stopping old requests and before loading a new Harness origin', async () => {
    const main = await readFile(path.join(projectRoot, 'src/main/index.ts'), 'utf8')
    const start = main.indexOf('async function openHarness(')
    const end = main.indexOf('\nfunction ', start)
    const openHarness = main.slice(start, end)

    expect(openHarness.indexOf('window.webContents.stop()')).toBeLessThan(
      openHarness.indexOf('await clearStaleLoopbackHttpCache(')
    )
    expect(openHarness.indexOf('await clearStaleLoopbackHttpCache(')).toBeLessThan(
      openHarness.indexOf('await window.loadURL(rendererUrl)')
    )
  })
})
