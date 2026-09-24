import { createRequire } from 'node:module'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const pruneWindowsNode = require('../scripts/prune-windows-node.cjs') as
  (context: { electronPlatformName: string; appOutDir: string }) => Promise<void>

describe('Windows package Node pruning', () => {
  it('removes only the duplicate Windows node.exe after packaging', async () => {
    const root = join(tmpdir(), `dsh-prune-${process.pid}-${Date.now()}`)
    const executable = join(root, 'resources', 'app', 'node_modules', 'node', 'bin', 'node.exe')
    mkdirSync(join(root, 'resources', 'app', 'node_modules', 'node', 'bin'), { recursive: true })
    writeFileSync(executable, 'node')
    try {
      await pruneWindowsNode({ electronPlatformName: 'darwin', appOutDir: root })
      expect(existsSync(executable)).toBe(true)
      await pruneWindowsNode({ electronPlatformName: 'win32', appOutDir: root })
      expect(existsSync(executable)).toBe(false)
      await pruneWindowsNode({ electronPlatformName: 'win32', appOutDir: root })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
