import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('packaged client module resolution', () => {
  it('uses the same createRequire fallback as the packaged Loader', async () => {
    const [loaderPatch, clientModulesPatch] = await Promise.all([
      readFile('patches/@deepseek-ai+cordis-plugin-loader+1.0.3.patch', 'utf8'),
      readFile(
        'patches/@deepseek-ai+dsh-client-modules+0.1.2-rc.1.patch',
        'utf8'
      )
    ])

    expect(loaderPatch).toContain('createRequire(new URL("package.json", this.ctx.baseUrl).href)')
    expect(clientModulesPatch).toContain('createRequire(baseUrl).resolve')
    expect(clientModulesPatch).toContain('expectedPackageName}/package.json')
  })
})
