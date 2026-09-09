import childProcess from 'node:child_process'
import { syncBuiltinESMExports, registerHooks } from 'node:module'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { enforceWindowsChildProcessHide } from './windows-child-process-hide.mjs'

// On macOS Harness runs inside an Electron utility process (TCC responsibility
// isolation), so `process.execPath` and `argv0` point at the Electron helper
// instead of a Node binary. Plugins re-invoke the dsh CLI through the
// executable running them — dsh-market forwards `process.execArgv` with it —
// and without Node mode that child boots as an Electron app, where the leading
// `--expose-internals` shifts argv and the CLI answers "--profile <name> is
// required" instead of installing. Declaring it here, after this process has
// already parsed the Chromium switches it was launched with, marks only the
// children as Node processes. Bundled-Node hosts (Windows, Linux) skip it.
if (process.versions.electron !== undefined) {
  process.env.ELECTRON_RUN_AS_NODE = '1'
}

const [dshEntryPath, ...dshArguments] = process.argv.slice(2)

// Diagnostic timestamps share a launch ID with the desktop. No environment,
// URLs, file contents or raw module specifiers are emitted by this tracer.
const startupRun = process.env.DSH_DESKTOP_STARTUP_RUN
const startupOrigin = performance.now()
const initialCpu = process.cpuUsage()
let startupStage = 'child.entry'
let moduleCount = 0
let moduleResolveMs = 0
let moduleLoadMs = 0
let lastPackage = ''
function timing(stage, status = 'done', details = {}) {
  if (!startupRun) return
  const cpu = process.cpuUsage(initialCpu)
  process.stdout.write('[startup-timing] ' + JSON.stringify({
    ...details, scope: 'harness', run: startupRun, pid: process.pid, at: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - startupOrigin),
    cpuMs: Math.round((cpu.user + cpu.system) / 1000), stage, status,
    moduleCount, moduleResolveMs: Math.round(moduleResolveMs), moduleLoadMs: Math.round(moduleLoadMs),
    lastPackage
  }) + '\n')
}
timing(startupStage, 'begin', { processUptimeMs: Math.round(process.uptime() * 1000) })
// Hooks observe synchronous resolution/source reads only, not module evaluation
// or asynchronous plugin activation. Keep this distinction in diagnostic reports.
const moduleHooks = startupRun ? registerHooks({
  resolve(specifier, context, nextResolve) {
    const start = performance.now()
    try { return nextResolve(specifier, context) }
    finally { moduleResolveMs += performance.now() - start }
  },
  load(url, context, nextLoad) {
    const start = performance.now()
    const match = url.replaceAll('\\', '/').match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/)
    lastPackage = match?.[1] ?? (url.startsWith('node:') ? '<builtin>' : '<local-module>')
    try { return nextLoad(url, context) }
    finally { moduleCount++; moduleLoadMs += performance.now() - start }
  }
}) : undefined
const heartbeat = startupRun ? setInterval(() => timing(startupStage, 'waiting'), 5_000) : undefined
heartbeat?.unref()


function report(label, value) {
  process.stderr.write(`[harness-node] ${label}: ${value}\n`)
}

process.on('uncaughtException', (error) => report('uncaught exception', error?.stack ?? error))
process.on('unhandledRejection', (error) => report('unhandled rejection', error?.stack ?? error))

process.stdout.write(
  `[harness-node] runtime node=${process.version} platform=${process.platform} arch=${process.arch}\n`
)
process.stdout.write(`[harness-node] execPath=${process.execPath}\n`)
process.stdout.write(`[harness-node] cwd=${process.cwd()}\n`)
process.stdout.write(`[harness-node] DSH_HOME=${process.env.DSH_HOME ?? ''}\n`)

// Harness and the plugins running inside it spawn their own child processes
// (pwsh, git, ripgrep, …) without windowsHide — that flag on the Harness
// process itself only hides Harness's own console, not what it goes on to
// launch. Each of those visible console windows steals foreground focus on
// Windows. Patching child_process here, before dshEntryPath loads, catches
// every spawn made anywhere in this process tree — Harness internals and
// third-party plugins alike — without needing an upstream fix in each of
// them. A caller that explicitly sets windowsHide keeps its own choice.
if (process.platform === 'win32') {
  // The Harness is spawned console-less (detached + windowsHide), so child
  // console apps flash their own window unless the Harness owns a hidden
  // console for them to inherit (issue #233).
  startupStage = 'child.windows-console'
  timing(startupStage, 'begin')
  const { createHiddenConsole } = await import('./windows-hidden-console.mjs')
  createHiddenConsole()

  enforceWindowsChildProcessHide(childProcess, syncBuiltinESMExports)

  process.stdout.write('[harness-node] windowsHide enforcement enabled for child processes\n')
  timing(startupStage)
}

if (!dshEntryPath) {
  report('startup error', 'missing DSH entry path')
  process.exitCode = 1
} else {
  process.stdout.write(`[harness-node] loading=${dshEntryPath}\n`)
  process.argv = [process.execPath, dshEntryPath, ...dshArguments]
  startupStage = 'child.harness-import-and-init'
  timing(startupStage, 'begin')
  try {
    await import(pathToFileURL(dshEntryPath).href)
    timing(startupStage)
    process.stdout.write('[harness-node] DSH entry loaded\n')
  } catch (error) {
    timing(startupStage, 'failed')
    report('DSH entry failed', error?.stack ?? error)
    process.exitCode = 1
  }
}

clearInterval(heartbeat)
moduleHooks?.deregister()
