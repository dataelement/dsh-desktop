import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const asar = require('@electron/asar') as {
  createPackageWithOptions(src: string, dest: string, options: { unpack?: string }): Promise<void>
}
const { verifyAsarUnpack } = require('../scripts/verify-asar-unpack.cjs') as {
  verifyAsarUnpack(resourcesDir: string): void
}

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

/** A 64-bit Mach-O header followed by padding. */
const MACHO = Buffer.concat([Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), Buffer.alloc(60)])

async function packagedApp(unpack?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-asar-unpack-'))
  roots.push(root)
  const app = join(root, 'app')
  await mkdir(join(app, 'node_modules', 'tool', 'bin'), { recursive: true })
  await writeFile(join(app, 'node_modules', 'tool', 'index.js'), 'module.exports = 1\n')
  await writeFile(join(app, 'node_modules', 'tool', 'bin', 'tool'), MACHO)
  const resources = join(root, 'Resources')
  await mkdir(resources)
  await asar.createPackageWithOptions(app, join(resources, 'app.asar'), unpack === undefined ? {} : { unpack })
  return resources
}

describe('verifyAsarUnpack', () => {
  it('rejects a native binary packed inside app.asar', async () => {
    const resources = await packagedApp()
    expect(() => verifyAsarUnpack(resources)).toThrow(/node_modules[\\/]tool[\\/]bin[\\/]tool \(Mach-O\)/u)
  })

  it('accepts the binary once asarUnpack places it beside the archive', async () => {
    const resources = await packagedApp('**/bin/tool')
    expect(() => verifyAsarUnpack(resources)).not.toThrow()
  })
})
