import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { clearStaleLoopbackHttpCache } from '../src/main/cache-maintenance'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('loopback HTTP cache maintenance', () => {
  it('clears the HTTP cache without reporting a healthy cleanup', async () => {
    const clearCache = vi.fn(async () => undefined)
    const note = vi.fn()

    await expect(clearStaleLoopbackHttpCache({ clearCache }, note)).resolves.toBe(true)
    expect(clearCache).toHaveBeenCalledOnce()
    expect(note).not.toHaveBeenCalled()
  })

  it('reports a failed cleanup without rejecting desktop startup', async () => {
    const clearCache = vi.fn(async () => {
      throw new Error('cache is locked')
    })
    const note = vi.fn()

    await expect(clearStaleLoopbackHttpCache({ clearCache }, note)).resolves.toBe(false)
    expect(note).toHaveBeenCalledWith(
      '[desktop] stale loopback HTTP cache cleanup failed: cache is locked'
    )
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
