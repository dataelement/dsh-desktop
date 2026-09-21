import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { spawnSync } from 'node:child_process'

/** Resolve a real Node binary, skipping Electron shims injected by DSH Desktop. */
export function resolveTestNodeExecutable(): string {
  const executable = process.platform === 'win32' ? 'node.exe' : 'node'
  const candidates = (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((directory) => join(directory, executable))

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const probe = spawnSync(
      candidate,
      ['-p', 'JSON.stringify({ execPath: process.execPath, electron: process.versions.electron })'],
      {
        encoding: 'utf8',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      }
    )
    if (probe.status !== 0 || probe.stdout.trim() === '') continue
    try {
      const runtime = JSON.parse(probe.stdout) as { execPath?: unknown; electron?: unknown }
      if (typeof runtime.execPath === 'string' && runtime.electron === undefined) return runtime.execPath
    } catch {
      // Not a Node-compatible candidate.
    }
  }
  throw new Error('A non-Electron Node.js executable is required for this test')
}
