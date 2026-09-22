import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const require = createRequire(import.meta.url)
const { parsePatchFile } = require('patch-package/dist/patch/parse') as {
  parsePatchFile: (file: string) => unknown
}

describe('patch hunk counts', () => {
  it('keeps every patch-package file parseable so Windows postinstall can apply them', async () => {
    const patchesDir = path.join(projectRoot, 'patches')
    const names = (await readdir(patchesDir)).filter((name) => name.endsWith('.patch'))
    expect(names.length).toBeGreaterThan(0)

    const errors: string[] = []
    for (const name of names) {
      const content = await readFile(path.join(patchesDir, name), 'utf8')
      try {
        parsePatchFile(content)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${name}: ${message}`)
      }
    }

    expect(errors).toEqual([])
  })

  it('keeps image generation and the log bridge in the dsh package.json patch', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches/@deepseek-ai+dsh+0.1.5-rc.2.patch'),
      'utf8'
    )
    expect(patch).toContain('+    "dsh-image-generation": "0.1.0",')
    expect(patch).toContain('+    "dsh-desktop-log-bridge": "0.1.0",')
  })

  it('rejects a dsh hunk header that undercounts the merged dependency lines', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches/@deepseek-ai+dsh+0.1.5-rc.2.patch'),
      'utf8'
    )
    const broken = patch.replace('@@ -28,6 +28,13 @@', '@@ -28,6 +28,12 @@')
    expect(broken).not.toBe(patch)
    expect(() => parsePatchFile(broken)).toThrow(/hunk header integrity check failed/)
  })
})
