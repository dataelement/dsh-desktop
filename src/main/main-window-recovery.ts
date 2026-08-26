export const MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS = 5_000
export const MAIN_WINDOW_RECOVERY_MAX_RELOADS = 3

/**
 * Decide whether the main window can be safely reloaded after the renderer
 * or GPU process went away. The default Electron behavior on Windows when
 * the GPU process dies is to leave the window drawn but blank, so a single
 * reload is almost always the right call — except when the same cause keeps
 * recurring, in which case reloading in a tight loop only masks the real
 * problem and exhausts the GPU. Bounding the reload attempts and spacing
 * them out is the difference between self-healing and a stuck window.
 */
export function shouldReloadAfterMainWindowRendererLoss(options: {
  now: number
  lastReloadAt: number
  reloadCount: number
  cooldownMs?: number
  maxReloads?: number
}): boolean {
  const cooldown = options.cooldownMs ?? MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS
  const maxReloads = options.maxReloads ?? MAIN_WINDOW_RECOVERY_MAX_RELOADS
  if (options.reloadCount >= maxReloads) return false
  if (options.lastReloadAt === 0) return true
  return options.now - options.lastReloadAt >= cooldown
}
