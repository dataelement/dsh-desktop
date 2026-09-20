import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('cordis-plugin-loader resolution patch', () => {
  it('falls back to resolving bare plugins relative to ctx.baseUrl', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+cordis-plugin-loader+1.0.3.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('const req = createRequire(new URL("package.json", this.ctx.baseUrl).href)')
    expect(patch).toContain('const resolved = req.resolve(name)')
    expect(patch).toContain('return await import(pathToFileURL(resolved).href)')
  })

  it('includes configurable timeout and logs stuck plugin entries', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+cordis-plugin-loader+1.0.3.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('DSH_LOADER_TIMEOUT_MS')
    expect(patch).toContain('plugin tree initialization timed out after')
    expect(patch).toContain('stuck entries:')
  })

  it('EntryTree.prototype.await times out and throws with culprit plugin info', async () => {
    const { EntryTree } = await import('@deepseek-ai/cordis-plugin-loader')
    const hangingPromise = new Promise(() => {})
    const mockTree = Object.create(EntryTree.prototype)
    const mockEntry = {
      options: { id: 'entry-99', name: 'slow-stuck-plugin' },
      _initTask: hangingPromise,
      _failure: (stage: string, err: Error) => {
        const error = new Error(`failed to ${stage} loader entry entry-99 (slow-stuck-plugin): ${err.message}`)
        ;(error as any).dshPluginFailure = { stage, packageName: 'slow-stuck-plugin' }
        return error
      }
    }
    mockTree.entries = function*() {
      yield mockEntry
    }
    mockTree.getTasks = () => [hangingPromise]

    await expect(mockTree.await({ timeout: 50 })).rejects.toThrow(
      /failed to apply loader entry entry-99 \(slow-stuck-plugin\): plugin initialization timed out/
    )
  })
})
