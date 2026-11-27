import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'

const require = createRequire(import.meta.url)

if (process.argv[2] === 'target') {
  const koffi = require('koffi')
  const window = koffi.load('kernel32.dll').func('GetConsoleWindow', 'void *', [])()
  const visible = koffi.load('user32.dll').func('IsWindowVisible', 'bool', ['void *'])

  // Verify that an unadorned spawn defaults to windowsHide: true via enforceWindowsChildProcessHide
  const grandchild = await new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => resolve({ code: 1, stderr: `${stderr}${error.message}` }))
    child.on('close', code => resolve({ code, stderr }))
  })

  console.log(JSON.stringify({
    attached: window !== null,
    visible: window !== null && visible(window),
    outerPid: Number(process.argv[3]),
    targetPid: process.pid,
    grandchildCode: grandchild.code,
    grandchildStderr: grandchild.stderr.trim()
  }))
} else {
  // Select the real Job path without booting a complete Harness Profile.
  const runtime = {
    selectContainmentMode: () => 'windows-job', internals: {},
    live: new Set(), controlChannels: new Set(), reportSpillFailure: console.error
  }
  const handle = LocalSubprocessRuntime.prototype.spawn.call(runtime, {
    argv: [process.execPath, import.meta.filename, 'target', String(process.pid)], cwd: process.cwd(),
    env: { ...process.env }, stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }, graceMs: 1000
  })
  handle.stdout.on('data', chunk => process.stdout.write(chunk))
  handle.stderr.on('data', chunk => process.stderr.write(chunk))
  const result = await handle.done
  process.exitCode = result.exitCode ?? 1
}
