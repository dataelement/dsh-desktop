import type childProcess from 'node:child_process'

export function applyWindowsHide<T>(options: T): T & { windowsHide: true }

export function enforceWindowsChildProcessHide(
  childProcessModule: typeof childProcess,
  syncBuiltinESMExports: () => void
): void
