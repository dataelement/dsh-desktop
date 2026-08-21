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
        '@deepseek-ai+cordis-plugin-loader+1.0.2.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('const req = createRequire(new URL("package.json", this.ctx.baseUrl).href)')
    expect(patch).toContain('const resolved = req.resolve(name)')
    expect(patch).toContain('return await import(pathToFileURL(resolved).href)')
  })
})
