/** Add the Windows no-console flag without overriding an explicit choice. */
export function applyWindowsHide(options) {
  if (options && typeof options === 'object' && options.windowsHide !== undefined) {
    return options
  }
  if (options && typeof options === 'object') {
    return { ...options, windowsHide: true }
  }
  return { windowsHide: true }
}

/**
 * Hide every child process launched from Harness on Windows.
 *
 * Node's ESM named exports for built-ins are not updated when the mutable
 * default export is patched. Calling syncBuiltinESMExports after replacing
 * the methods is therefore essential: Harness packages commonly use
 * `import { spawn } from 'node:child_process'` and would otherwise keep the
 * original, window-creating function.
 */
export function enforceWindowsChildProcessHide(childProcess, syncBuiltinESMExports) {
  const originalSpawn = childProcess.spawn
  const originalSpawnSync = childProcess.spawnSync
  const originalExec = childProcess.exec
  const originalExecSync = childProcess.execSync
  const originalExecFile = childProcess.execFile
  const originalExecFileSync = childProcess.execFileSync
  const originalFork = childProcess.fork

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

  syncBuiltinESMExports()
}
