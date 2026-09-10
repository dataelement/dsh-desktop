export interface CopyShortcutInput {
  type: string
  key: string
  control: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}

/**
 * Electron normally routes Ctrl+C through the application menu's `copy` role.
 * Some Windows shells fail to dispatch that hidden-menu accelerator, while the
 * equivalent WebContents.copy() command still works. Keep the fallback exact so
 * Ctrl+Shift+C, AltGr combinations, and non-Windows editing remain untouched.
 */
export function isWindowsCopyShortcut(
  input: CopyShortcutInput,
  platform: NodeJS.Platform
): boolean {
  return platform === 'win32' &&
    input.type === 'keyDown' &&
    input.key.toLowerCase() === 'c' &&
    input.control &&
    !input.shift &&
    !input.alt &&
    !input.meta
}
