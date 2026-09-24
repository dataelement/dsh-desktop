import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const helper = join(
  process.cwd(), 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents',
  'Frameworks', 'Electron Helper.app', 'Contents', 'MacOS', 'Electron Helper'
)

describe.runIf(process.platform === 'darwin' && existsSync(helper))('PTC Electron Helper runtime', () => {
  it('runs the Helper as Node when PTC inherits ELECTRON_RUN_AS_NODE', async () => {
    const { stdout } = await run(helper, [
      '-p', 'JSON.stringify({ node: process.version, electron: process.versions.electron })'
    ], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    })
    const runtime = JSON.parse(stdout)
    expect(runtime.node).toMatch(/^v\d+/)
    expect(runtime.electron).toBe('43.0.0')
  })

  it('keeps Node mode available to the PTC child runtime', async () => {
    const source = await readFile(
      join(process.cwd(), 'node_modules', '@deepseek-ai', 'dsh-ptc-runtime-node', 'lib', 'index.js'),
      'utf8'
    )
    expect(source).toContain('key.toUpperCase() !== "ELECTRON_RUN_AS_NODE"')
  })
})
