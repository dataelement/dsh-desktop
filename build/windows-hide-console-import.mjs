import childProcess from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Set on the Host after a hidden console is attached. Job runner spawns read
 * it in-process. Subprocess env scrubbing strips `DSH_*`, so targets such as
 * Codex do not inherit the marker.
 */
export const HIDDEN_CONSOLE_ENV = 'DSH_DESKTOP_HIDDEN_CONSOLE'

/**
 * Add the Windows no-console flag (CREATE_NO_WINDOW) without overriding an explicit choice.
 * @template T
 * @param {T} options
 * @returns {T}
 */
export function applyWindowsHide(options) {
  if (options && typeof options === 'object' && options.windowsHide !== undefined) {
    return options
  }
  if (options && typeof options === 'object') {
    return { ...options, windowsHide: true }
  }
  return /** @type {T} */ ({ windowsHide: true })
}

/**
 * Intercept child_process methods so that console-subsystem binaries
 * (such as Codex's codex.exe, powershell.exe, or cmd.exe) spawned without explicit
 * windowsHide default to CREATE_NO_WINDOW on Windows, preventing console window flashing.
 *
 * @param {typeof childProcess} [cp]
 * @param {typeof syncBuiltinESMExports} [sync]
 */
export function enforceWindowsChildProcessHide(cp = childProcess, sync = syncBuiltinESMExports) {
  if (process.platform !== 'win32') return

  const originalSpawn = cp.spawn
  const originalSpawnSync = cp.spawnSync
  const originalExec = cp.exec
  const originalExecSync = cp.execSync
  const originalExecFile = cp.execFile
  const originalExecFileSync = cp.execFileSync
  const originalFork = cp.fork

  cp.spawn = function patchedSpawn(command, args, options) {
    if (Array.isArray(args)) {
      return originalSpawn.call(this, command, args, applyWindowsHide(options))
    }
    return originalSpawn.call(this, command, applyWindowsHide(args))
  }

  cp.spawnSync = function patchedSpawnSync(command, args, options) {
    if (Array.isArray(args)) {
      return originalSpawnSync.call(this, command, args, applyWindowsHide(options))
    }
    return originalSpawnSync.call(this, command, applyWindowsHide(args))
  }

  cp.exec = function patchedExec(command, options, callback) {
    if (typeof options === 'function') {
      return originalExec.call(this, command, applyWindowsHide(undefined), options)
    }
    return originalExec.call(this, command, applyWindowsHide(options), callback)
  }

  cp.execSync = function patchedExecSync(command, options) {
    return originalExecSync.call(this, command, applyWindowsHide(options))
  }

  cp.execFile = function patchedExecFile(file, args, options, callback) {
    if (typeof args === 'function') {
      return originalExecFile.call(this, file, applyWindowsHide(undefined), undefined, args)
    }
    if (typeof options === 'function') {
      return originalExecFile.call(this, file, args, applyWindowsHide(undefined), options)
    }
    return originalExecFile.call(this, file, args, applyWindowsHide(options), callback)
  }

  cp.execFileSync = function patchedExecFileSync(file, args, options) {
    if (args && !Array.isArray(args)) {
      return originalExecFileSync.call(this, file, applyWindowsHide(args))
    }
    return originalExecFileSync.call(this, file, args, applyWindowsHide(options))
  }

  cp.fork = function patchedFork(modulePath, args, options) {
    if (Array.isArray(args)) {
      return originalFork.call(this, modulePath, args, applyWindowsHide(options))
    }
    return originalFork.call(this, modulePath, applyWindowsHide(args))
  }

  if (typeof sync === 'function') {
    sync()
  }
}

/** SW_HIDE: hide the window and activate another one. */
const SW_HIDE = 0

/** Win32 standard-handle ids. AllocConsole replaces these with console handles. */
const STD_INPUT_HANDLE = 0xFFFFFFF6
const STD_OUTPUT_HANDLE = 0xFFFFFFF5
const STD_ERROR_HANDLE = 0xFFFFFFF4
const STD_HANDLES = [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE]

/**
 * Attach a hidden console to this console-less process and enforce CREATE_NO_WINDOW
 * on child process spawns.
 *
 * @param {{
 *   load?: (library: string) => { func: Function },
 *   env?: NodeJS.ProcessEnv,
 *   platform?: NodeJS.Platform,
 *   resourcesPath?: string
 * }} [options]
 * @returns {boolean} true when a console is attached.
 */
export function attachHiddenConsole(options = {}) {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return false
  const env = options.env ?? process.env

  enforceWindowsChildProcessHide()

  try {
    const loadLibrary = options.load ?? resolveKoffiLoad(options.resourcesPath ?? process.resourcesPath)
    const kernel32 = loadLibrary('kernel32.dll')
    const user32 = loadLibrary('user32.dll')
    return allocateHiddenConsole(kernel32, user32, env)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    process.stderr.write(
      `[windows-hide-console] hidden console was not created (${detail}); child consoles may remain visible\n`
    )
    return false
  }
}

/**
 * @param {{ func: Function }} kernel32
 * @returns {unknown[]}
 */
function captureStdHandles(kernel32) {
  const getStdHandle = kernel32.func('GetStdHandle', 'void *', ['uint32'])
  return STD_HANDLES.map(handle => getStdHandle(handle))
}

/**
 * @param {{ func: Function }} kernel32
 * @param {unknown[]} handles
 */
function restoreStdHandles(kernel32, handles) {
  const setStdHandle = kernel32.func('SetStdHandle', 'bool', ['uint32', 'void *'])
  for (let index = 0; index < STD_HANDLES.length; index += 1) {
    setStdHandle(STD_HANDLES[index], handles[index])
  }
}

/**
 * @param {{ func: Function }} kernel32
 * @param {{ func: Function }} user32
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
function allocateHiddenConsole(kernel32, user32, env) {
  const previousHandles = captureStdHandles(kernel32)
  try {
    const allocConsole = kernel32.func('AllocConsole', 'bool', [])
    const getConsoleWindow = kernel32.func('GetConsoleWindow', 'void *', [])
    const showWindow = user32.func('ShowWindow', 'bool', ['void *', 'int'])
    if (!allocConsole()) {
      process.stderr.write(
        '[windows-hide-console] hidden console was not created (AllocConsole returned false); child consoles may remain visible\n'
      )
      return false
    }
    const window = getConsoleWindow()
    if (window) showWindow(window, SW_HIDE)
    env[HIDDEN_CONSOLE_ENV] = '1'
    return true
  } finally {
    restoreStdHandles(kernel32, previousHandles)
  }
}

/**
 * @param {string | undefined} resourcesPath
 * @returns {(library: string) => { func: Function }}
 */
function resolveKoffiLoad(resourcesPath) {
  const anchor = findKoffiAnchor(resourcesPath)
  return createRequire(anchor)('koffi').load
}

/**
 * Dev walks up from `build/` to the repository `node_modules`. Packaged builds
 * keep this file in `resources/` and dependencies in `resources/app.asar`.
 * @param {string | undefined} resourcesPath
 * @returns {string}
 */
function findKoffiAnchor(resourcesPath) {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'node_modules', 'koffi', 'package.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  if (typeof resourcesPath === 'string' && resourcesPath.length > 0) {
    for (const root of ['app.asar', 'app']) {
      const candidate = join(resourcesPath, root, 'package.json')
      if (existsSync(candidate)) return candidate
    }
  }
  throw new Error('koffi was not found')
}

function loadedAsConsoleBootstrap() {
  const argv = process.execArgv
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    const next = argv[index + 1] ?? ''
    if (arg === '--import' && next.includes('windows-hide-console-import')) return true
    if (arg.startsWith('--import=') && arg.includes('windows-hide-console-import')) return true
  }
  return false
}

if (process.platform === 'win32') {
  enforceWindowsChildProcessHide()
}

// `--import` evaluates this file before the entry. Unit tests import the
// function directly and must not attach a console to the test process.
if (loadedAsConsoleBootstrap()) attachHiddenConsole()
