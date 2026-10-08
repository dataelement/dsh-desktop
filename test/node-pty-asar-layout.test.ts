import { cp, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const nodePtyRoot = dirname(require.resolve('node-pty/package.json'))

type Pty = {
  onData(listener: (data: string) => void): void
  onExit(listener: (event: { exitCode: number }) => void): void
}
type NodePty = { spawn(file: string, args: string[], options: { cwd: string, env: NodeJS.ProcessEnv }): Pty }

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

// Only macOS launches the shell through node-pty's spawn-helper binary.
describe.runIf(process.platform === 'darwin')('node-pty in the packaged asar layout', () => {
  it('starts a terminal when loaded from app.asar with its native files unpacked', async () => {
    // Packaged Harness loads node-pty through app.asar while asarUnpack keeps
    // spawn-helper and pty.node in app.asar.unpacked. Upstream node-pty maps
    // the one to the other, so this layout needs no node-pty patch.
    const root = await mkdtemp(join(tmpdir(), 'dsh-node-pty-'))
    roots.push(root)
    const resources = join(root, 'DSH Desktop.app', 'Contents', 'Resources')
    const packaged = join(resources, 'app.asar', 'node_modules', 'node-pty')
    await cp(nodePtyRoot, packaged, { recursive: true })
    await cp(join(nodePtyRoot, 'prebuilds'), join(resources, 'app.asar.unpacked', 'node_modules', 'node-pty', 'prebuilds'), { recursive: true })
    const pty = require(packaged) as NodePty

    const terminal = pty.spawn('/bin/echo', ['dsh-pty-ok'], { cwd: root, env: process.env })
    let output = ''
    terminal.onData((data) => { output += data })
    const exitCode = await new Promise<number>(resolve => terminal.onExit(({ exitCode }) => resolve(exitCode)))

    expect(exitCode).toBe(0)
    expect(output).toContain('dsh-pty-ok')
  })
})
