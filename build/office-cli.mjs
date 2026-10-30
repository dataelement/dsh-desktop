import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerOfficeEngineResolution } from './office-engine-resolution.mjs'

// Agent shells inherit Node mode from harness-node-entry. Declare it again for
// LibreOffice's children; this CLI must be launched with ELECTRON_RUN_AS_NODE=1.
process.env.ELECTRON_RUN_AS_NODE = '1'
const archive = join(import.meta.dirname, 'app.asar')
const root = existsSync(archive) ? archive : dirname(import.meta.dirname)
const requireHost = createRequire(join(root, 'package.json'))
registerOfficeEngineResolution(requireHost.resolve('@deepseek-ai/dsh/lib/bin.js'))
await import(pathToFileURL(requireHost.resolve('@deepseek-ai/libreoffice-kit/cli')).href)

if (process.platform === 'win32' && (process.exitCode ?? 0) === 0) {
  // The upstream CLI has already disposed its converter and published its
  // result. Electron's Node mode can otherwise revisit a completed Windows
  // child-process handle during event-loop teardown and fail after success.
  const flush = stream => new Promise((resolve, reject) => stream.write('', error => error ? reject(error) : resolve()))
  await Promise.all([flush(process.stdout), flush(process.stderr)])
  process.exit(0)
}
