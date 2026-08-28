import childProcess from 'node:child_process'
import { pathToFileURL } from 'node:url'

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
  const originalSpawn = childProcess.spawn
  const originalSpawnSync = childProcess.spawnSync
  const originalExec = childProcess.exec
  const originalExecSync = childProcess.execSync
  const originalExecFile = childProcess.execFile
  const originalExecFileSync = childProcess.execFileSync
  const originalFork = childProcess.fork

  function applyWindowsHide(options) {
    if (options && typeof options === 'object' && options.windowsHide !== undefined) {
      return options
    }
    if (options && typeof options === 'object') {
      return { ...options, windowsHide: true }
    }
    return { windowsHide: true }
  }

  childProcess.spawn = function patchedSpawn(command, args, options) {
    if (Array.isArray(args)) {
      return originalSpawn.call(this, command, args, applyWindowsHide(options))
    }
    return originalSpawn.call(this, command, applyWindowsHide(args))
  }

  childProcess.spawnSync = function patchedSpawnSync(command, args, options) {
    if (Array.isArray(args)) {
      return originalSpawnSync.call(this, command, args, applyWindowsHide(options))
    }
    return originalSpawnSync.call(this, command, applyWindowsHide(args))
  }

  childProcess.exec = function patchedExec(command, options, callback) {
    if (typeof options === 'function') {
      return originalExec.call(this, command, applyWindowsHide(undefined), options)
    }
    return originalExec.call(this, command, applyWindowsHide(options), callback)
  }

  childProcess.execSync = function patchedExecSync(command, options) {
    return originalExecSync.call(this, command, applyWindowsHide(options))
  }

  childProcess.execFile = function patchedExecFile(file, args, options, callback) {
    if (typeof args === 'function') {
      return originalExecFile.call(this, file, applyWindowsHide(undefined), undefined, args)
    }
    if (typeof options === 'function') {
      return originalExecFile.call(this, file, args, applyWindowsHide(undefined), options)
    }
    return originalExecFile.call(this, file, args, applyWindowsHide(options), callback)
  }

  childProcess.execFileSync = function patchedExecFileSync(file, args, options) {
    if (args && !Array.isArray(args)) {
      return originalExecFileSync.call(this, file, applyWindowsHide(args))
    }
    return originalExecFileSync.call(this, file, args, applyWindowsHide(options))
  }

  childProcess.fork = function patchedFork(modulePath, args, options) {
    if (Array.isArray(args)) {
      return originalFork.call(this, modulePath, args, applyWindowsHide(options))
    }
    return originalFork.call(this, modulePath, applyWindowsHide(args))
  }

  process.stdout.write('[harness-node] windowsHide enforcement enabled for child processes\n')
}

if (!dshEntryPath) {
  report('startup error', 'missing DSH entry path')
  process.exitCode = 1
} else {
  process.stdout.write(`[harness-node] loading=${dshEntryPath}\n`)
  process.argv = [process.execPath, dshEntryPath, ...dshArguments]
  try {
    await import(pathToFileURL(dshEntryPath).href)
    process.stdout.write('[harness-node] DSH entry loaded\n')
  } catch (error) {
    report('DSH entry failed', error?.stack ?? error)
    process.exitCode = 1
  }
}
