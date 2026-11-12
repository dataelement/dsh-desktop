import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
export const hostBundle = join(root, 'out', 'main', 'host.js')

export async function ensureHostBundle(): Promise<void> {
  const sourceTime = (await stat(join(root, 'src/host/index.ts'))).mtimeMs
  let builtTime = 0
  try {
    builtTime = (await stat(hostBundle)).mtimeMs
  } catch {
    builtTime = 0
  }
  if (builtTime >= sourceTime) return
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  await new Promise<void>((resolveBuild, reject) => {
    execFile(command, ['electron-vite', 'build'], {
      cwd: root,
      timeout: 180_000,
      shell: process.platform === 'win32'
    }, error => {
      if (error === null) resolveBuild()
      else reject(error)
    })
  })
}
