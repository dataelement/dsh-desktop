import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
// The pid list is written to a file: a redirected PowerShell pipe is UTF-16,
// and a uint[] P/Invoke without [Out] returns 0 without failing the process.
const grandchildProbe = `
param([Parameter(Mandatory = $true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DshConsoleList {
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint GetConsoleProcessList(
    [Out, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 1)] uint[] processIds,
    uint count);
}
"@
  $ids = New-Object 'uint[]' 64
  $count = [DshConsoleList]::GetConsoleProcessList($ids, [uint32]64)
  if ($count -eq 0) {
    $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Set-Content -LiteralPath $OutputPath -Value "error $err" -Encoding ascii
    exit 2
  }
  if ($count -gt 64) {
    $ids = New-Object 'uint[]' $count
    $count = [DshConsoleList]::GetConsoleProcessList($ids, [uint32]$count)
  }
  $lines = for ($index = 0; $index -lt $count; $index++) { $ids[$index] }
  Set-Content -LiteralPath $OutputPath -Value ($lines -join ' ') -Encoding ascii
} catch {
  Set-Content -LiteralPath $OutputPath -Value ("exception " + $_.Exception.Message) -Encoding ascii -ErrorAction SilentlyContinue
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`.trim()

if (process.argv[2] === 'target') {
  const koffi = require('koffi')
  const window = koffi.load('kernel32.dll').func('GetConsoleWindow', 'void *', [])()
  const visible = koffi.load('user32.dll').func('IsWindowVisible', 'bool', ['void *'])
  const probeDir = mkdtempSync(join(tmpdir(), 'dsh-console-'))
  const scriptPath = join(probeDir, 'probe.ps1')
  const outputPath = join(probeDir, 'pids.txt')
  writeFileSync(scriptPath, grandchildProbe)
  const grandchild = await new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath, outputPath], {
      windowsHide: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => resolve({ code: 1, stderr: `${stderr}${error.message}` }))
    child.on('close', code => resolve({ code, stderr }))
  })
  let grandchildOutput = ''
  try {
    grandchildOutput = readFileSync(outputPath, 'utf8').trim()
  } catch (error) {
    grandchildOutput = error instanceof Error ? error.message : String(error)
  }
  rmSync(probeDir, { recursive: true, force: true })
  const grandchildPids = grandchildOutput.split(/\s+/).filter(part => /^\d+$/.test(part)).map(Number)
  console.log(JSON.stringify({
    attached: window !== null,
    visible: window !== null && visible(window),
    outerPid: Number(process.argv[3]),
    consolePids: consoleProcessIds(),
    grandchildPids,
    grandchildCode: grandchild.code,
    grandchildOutput,
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
