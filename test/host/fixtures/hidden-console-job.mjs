import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'

const require = createRequire(import.meta.url)

// GetConsoleProcessList writes the buffer during the call, so a typed array is enough.
function consoleProcessIds() {
  const getList = require('koffi').load('kernel32.dll').func('GetConsoleProcessList', 'uint32', ['uint32 *', 'uint32'])
  let list = new Uint32Array(32)
  let count = getList(list, list.length)
  if (count > list.length) {
    list = new Uint32Array(count)
    count = getList(list, list.length)
  }
  if (count === 0 || count > list.length) return []
  return Array.from(list.subarray(0, count))
}

// powershell.exe is a console-subsystem process, like codex.exe. Electron is not:
// launching it here would not inherit the console. windowsHide stays false so
// Node does not pass CREATE_NO_WINDOW and the child keeps this console.
const grandchildProbe = `
$signature = '[DllImport("kernel32.dll")] public static extern uint GetConsoleProcessList(uint[] ids, uint count);'
$type = Add-Type -MemberDefinition $signature -Name ConsoleList -Namespace DshHide -PassThru
$ids = New-Object 'uint[]' 64
$count = $type::GetConsoleProcessList($ids, 64)
if ($count -gt 64) { $ids = New-Object 'uint[]' $count; $count = $type::GetConsoleProcessList($ids, $count) }
for ($index = 0; $index -lt $count; $index++) { Write-Output $ids[$index] }
`.trim()

if (process.argv[2] === 'target') {
  const koffi = require('koffi')
  const window = koffi.load('kernel32.dll').func('GetConsoleWindow', 'void *', [])()
  const visible = koffi.load('user32.dll').func('IsWindowVisible', 'bool', ['void *'])
  const grandchild = await new Promise(resolve => {
    // -EncodedCommand avoids Windows PowerShell re-parsing quotes from the command line.
    const encoded = Buffer.from(grandchildProbe, 'utf16le').toString('base64')
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
  const grandchildPids = grandchild.stdout.trim().split(/\s+/).filter(Boolean).map(Number)
  console.log(JSON.stringify({
    attached: window !== null,
    visible: window !== null && visible(window),
    outerPid: Number(process.argv[3]),
    consolePids: consoleProcessIds(),
    grandchildPids,
    grandchildCode: grandchild.code,
    grandchildStderr: grandchild.stderr.trim()
  }))
} else {
  // Select the real Job path without booting a complete Harness Profile.
  // No attach=parent on this process: it allocates, the same way Host does.
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
