import { createRequire } from 'node:module'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'

if (process.argv[2] === 'target') {
  const koffi = createRequire(import.meta.url)('koffi')
  const window = koffi.load('kernel32.dll').func('GetConsoleWindow', 'void *', [])()
  const visible = koffi.load('user32.dll').func('IsWindowVisible', 'bool', ['void *'])
  console.log(JSON.stringify({ attached: window !== null, visible: window !== null && visible(window) }))
} else {
  // Select the real Job path without booting a complete Harness Profile.
  const runtime = {
    selectContainmentMode: () => 'windows-job', internals: {},
    live: new Set(), controlChannels: new Set(), reportSpillFailure: console.error
  }
  const handle = LocalSubprocessRuntime.prototype.spawn.call(runtime, {
    argv: [process.execPath, import.meta.filename, 'target'], cwd: process.cwd(),
    env: { ...process.env }, stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }, graceMs: 1000
  })
  handle.stdout.on('data', chunk => process.stdout.write(chunk))
  handle.stderr.on('data', chunk => process.stderr.write(chunk))
  const result = await handle.done
  process.exitCode = result.exitCode ?? 1
}
