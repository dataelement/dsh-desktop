import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

/**
 * Electron's asar-backed `fs` answers `stat(path, { bigint: true })` with a
 * number-mode `Stats` object for paths inside `app.asar`. `dsh-fs-local`
 * probes such paths for the agent-preset skill directory, so the unpatched
 * `Number(info.mode & 0o777n)` threw `Cannot mix BigInt and other types`,
 * skipped the whole filesystem skill provider, and left skill catalogs empty
 * (see dataelement/dsh-desktop#696).
 *
 * The patch normalizes the mode with `BigInt(...)` before masking; the
 * assertions below fail if `postinstall` drops it or a Harness upgrade changes
 * the probe shape without re-validating the patch.
 */
const packageRoot = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-fs-local')

describe('dsh-fs-local number-mode stat patch', () => {
  it('normalizes the mode before masking in both probe paths', async () => {
    const lib = await readFile(path.join(packageRoot, 'lib', 'index.js'), 'utf8')
    expect(lib).not.toContain('Number(info.mode & 511n)')
    expect(lib.match(/Number\(BigInt\(info\.mode\) & 511n\)/g)).toHaveLength(2)
  })

  it('ships the patch against the pinned Harness version', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-fs-local'), 'utf8')
    expect(patch).toContain('node_modules/@deepseek-ai/dsh-fs-local/lib/index.js')
    expect(patch).toContain('+		mode: Number(BigInt(info.mode) & 511n),')
    expect(patch).toContain('-		mode: Number(info.mode & 511n),')
  })

  it('accepts both stat shapes once the mode is normalized', () => {
    // Extracted expression: BigInt() accepts the bigint a real Node stat
    // returns and the number Electron's asar layer returns.
    const permissionBits = (mode: bigint | number): number => Number(BigInt(mode) & 0o777n)
    expect(permissionBits(0o100644)).toBe(0o644)
    expect(permissionBits(0o100644n)).toBe(0o644)
  })
})
