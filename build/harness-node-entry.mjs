import childProcess from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

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
  const originalExecSync = childProcess.execSync
  const originalExecFile = childProcess.execFile
  const originalExecFileSync = childProcess.execFileSync
  const originalFork = childProcess.fork

  function applyWindowsHide(options) {
    if (options && typeof options === 'object') {
      return options.windowsHide === undefined ? { ...options, windowsHide: true } : options
    }
    return { windowsHide: true }
  }

  // `file[, args][, options][, callback]` — every part optional. Guessing the
  // shape from one positional slot mixes options into the args slot, so read
  // the tail positionally instead and hand the original a fixed arity.
  function splitOptionalArguments(rest) {
    let index = 0
    const args = Array.isArray(rest[index]) ? rest[index++] : undefined
    const options =
      rest[index] !== null && typeof rest[index] === 'object' ? rest[index++] : undefined
    const callback = typeof rest[index] === 'function' ? rest[index] : undefined
    return { args, options, callback }
  }

  /** Keep `promisify(fn)` resolving to `{ stdout, stderr }` rather than stdout alone. */
  function inheritPromisify(patched, original) {
    if (promisify.custom in original) patched[promisify.custom] = original[promisify.custom]
    return patched
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

  // `exec` is deliberately left alone. Node implements it as a call to
  // `module.exports.execFile`, so patching both made every `exec` re-enter the
  // patched `execFile` with `exec`'s own `(file, options, callback)` shape —
  // the options object landed in the args slot and the callback in the options
  // slot, and Node rejected the call with ERR_INVALID_ARG_TYPE. Every `exec`
  // in the Harness process threw. Patching only `execFile` still covers `exec`
  // (verified: the hide reaches the spawn) and keeps `exec`'s own
  // `promisify.custom` intact.
  childProcess.execFile = inheritPromisify(function patchedExecFile(file, ...rest) {
    const { args, options, callback } = splitOptionalArguments(rest)
    return originalExecFile.call(this, file, args ?? [], applyWindowsHide(options), callback)
  }, originalExecFile)

  childProcess.execSync = function patchedExecSync(command, options) {
    return originalExecSync.call(this, command, applyWindowsHide(options))
  }

  childProcess.execFileSync = function patchedExecFileSync(file, ...rest) {
    const { args, options } = splitOptionalArguments(rest)
    return originalExecFileSync.call(this, file, args ?? [], applyWindowsHide(options))
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
