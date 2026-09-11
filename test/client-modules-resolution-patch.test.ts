import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

describe('packaged client module resolution', () => {
  it('uses the same createRequire fallback as the packaged Loader', async () => {
    const [loaderPatch, clientModulesPatch] = await Promise.all([
      readFile(patchPath('@deepseek-ai/cordis-plugin-loader'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-modules'), 'utf8')
    ])

    expect(loaderPatch).toContain('createRequire(new URL("package.json", this.ctx.baseUrl).href)')
    expect(clientModulesPatch).toContain('createRequire(baseUrl).resolve')
    expect(clientModulesPatch).toContain('expectedPackageName}/package.json')
  })
})
