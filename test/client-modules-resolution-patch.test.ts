import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

describe('packaged client module resolution', () => {
  it('resolves client modules through the same runtime installation scope as the Loader', async () => {
    const [loader, clientModulesPatch] = await Promise.all([
      readFile('node_modules/@deepseek-ai/cordis-plugin-loader/lib/index.js', 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-modules'), 'utf8')
    ])

    expect(loader).toContain('this.ctx.loader.internal.import(name, this.ctx.baseUrl, {})')
    expect(clientModulesPatch).toContain('createRequire(baseUrl).resolve')
    expect(clientModulesPatch).toContain('expectedPackageName}/package.json')
  })
})
